const express = require('express');
const { query, transaction } = require('../db');
const { requireAuth, requireBdsp } = require('../middleware/auth');
const { assertOneOf, asNonNegativeNumber, asStringArray, requireFields } = require('../validation');
const { badRequest, forbidden, notFound } = require('../httpError');

const router = express.Router();

// Helper: check if user is a participant in a deal
function isParticipant(userId, deal) {
  return (
    deal.bdsp_user_id === userId ||
    deal.buyer_user_id === userId ||
    deal.logistics_user_id === userId ||
    deal.seller_user_ids.includes(userId)
  );
}

// Helper: build deal SELECT with hub info
const DEAL_SELECT = `
  SELECT d.deal_id, d.hub_id, d.bdsp_user_id, d.buyer_user_id, d.seller_user_ids,
         d.logistics_user_id, d.deal_value, d.escrow_status, d.insurance_status,
         d.v4v_revenue, d.bdsp_commission,
         d.buyer_confirmed_at, d.logistics_confirmed_at, d.seller_confirmed_at,
         h.item_name, h.category, h.post_ids
  FROM deals d
  JOIN hubs h ON h.hub_id = d.hub_id
`;

// Helper: auto-release when all 3 parties have confirmed
async function tryAutoRelease(client, dealId) {
  const deal = (await client.query(
    `SELECT d.*, h.post_ids, h.status AS hub_status
     FROM deals d
     JOIN hubs h ON h.hub_id = d.hub_id
     WHERE d.deal_id = $1`,
    [dealId],
  )).rows[0];

  if (!deal) return null;

  if (deal.buyer_confirmed_at && deal.logistics_confirmed_at && deal.seller_confirmed_at) {
    await client.query(
      "UPDATE deals SET escrow_status = 'Released' WHERE deal_id = $1",
      [dealId],
    );
    await client.query(
      "UPDATE hubs SET status = 'Completed' WHERE hub_id = $1",
      [deal.hub_id],
    );
    if (deal.post_ids && deal.post_ids.length > 0) {
      await client.query(
        "UPDATE posts SET status = 'Closed' WHERE post_id = ANY($1)",
        [deal.post_ids],
      );
    }

    // Re-read to return updated deal
    return (await client.query(`${DEAL_SELECT} WHERE d.deal_id = $1`, [dealId])).rows[0];
  }

  return (await client.query(`${DEAL_SELECT} WHERE d.deal_id = $1`, [dealId])).rows[0];
}

// GET /deals — BDSP's own deals (existing)
router.get('/', requireBdsp, async (req, res, next) => {
  try {
    const result = await query(
      `${DEAL_SELECT}
       WHERE d.bdsp_user_id = $1
       ORDER BY d.deal_id DESC`,
      [req.user.user_id],
    );
    res.json({ deals: result.rows });
  } catch (error) {
    next(error);
  }
});

// GET /deals/my — deals where current user is any participant
// NOTE: this must come BEFORE /:dealId or "my" gets captured as :dealId
router.get('/my', requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      `${DEAL_SELECT}
       WHERE d.bdsp_user_id = $1
          OR d.buyer_user_id = $1
          OR d.logistics_user_id = $1
          OR $1 = ANY(d.seller_user_ids)
       ORDER BY d.deal_id DESC`,
      [req.user.user_id],
    );
    res.json({ deals: result.rows });
  } catch (error) {
    next(error);
  }
});

// GET /deals/:dealId — single deal (participant only)
router.get('/:dealId', requireAuth, async (req, res, next) => {
  try {
    const result = await query(`${DEAL_SELECT} WHERE d.deal_id = $1`, [req.params.dealId]);
    if (result.rowCount === 0) throw notFound('Deal not found');
    const deal = result.rows[0];
    if (!isParticipant(req.user.user_id, deal)) throw forbidden('Not a participant in this deal');
    res.json({ deal });
  } catch (error) {
    next(error);
  }
});

// POST /deals — create deal (existing)
router.post('/', requireBdsp, async (req, res, next) => {
  try {
    requireFields(req.body, ['hub_id', 'buyer_user_id', 'seller_user_ids', 'deal_value']);
    const sellerUserIds = asStringArray(req.body.seller_user_ids, 'seller_user_ids');
    if (sellerUserIds.length === 0) {
      throw badRequest('seller_user_ids must contain at least one user id');
    }
    if (req.body.escrow_status) {
      assertOneOf(req.body.escrow_status, ['Funds-Held-Placeholder', 'Released', 'Cancelled'], 'escrow_status');
    }
    if (req.body.insurance_status) {
      assertOneOf(req.body.insurance_status, ['Certificate-Issued-Placeholder', 'Pending', 'Expired'], 'insurance_status');
    }

    const result = await query(
      `INSERT INTO deals (
        hub_id, bdsp_user_id, buyer_user_id, seller_user_ids, logistics_user_id,
        deal_value, escrow_status, insurance_status
      )
      VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 'Funds-Held-Placeholder'), COALESCE($8, 'Certificate-Issued-Placeholder'))
      RETURNING deal_id, hub_id, bdsp_user_id, buyer_user_id, seller_user_ids,
                logistics_user_id, deal_value, escrow_status, insurance_status,
                v4v_revenue, bdsp_commission`,
      [
        req.body.hub_id,
        req.user.user_id,
        req.body.buyer_user_id,
        sellerUserIds,
        req.body.logistics_user_id || null,
        asNonNegativeNumber(req.body.deal_value, 'deal_value'),
        req.body.escrow_status || null,
        req.body.insurance_status || null,
      ],
    );

    res.locals.auditAction = `Created deal ${result.rows[0].deal_id}`;
    res.status(201).json({ deal: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// PATCH /deals/:dealId/deposit — BDSP deposits funds
router.patch('/:dealId/deposit', requireBdsp, async (req, res, next) => {
  try {
    const deal = (await query('SELECT * FROM deals WHERE deal_id = $1', [req.params.dealId])).rows[0];
    if (!deal) throw notFound('Deal not found');
    if (deal.bdsp_user_id !== req.user.user_id) throw forbidden('Only the managing BDSP can deposit funds');
    if (deal.escrow_status === 'Released') throw badRequest('Cannot deposit on a released deal');

    const result = await query(
      `UPDATE deals SET escrow_status = 'Funds-Held-Placeholder' WHERE deal_id = $1
       RETURNING deal_id, hub_id, bdsp_user_id, buyer_user_id, seller_user_ids,
                 logistics_user_id, deal_value, escrow_status, insurance_status,
                 v4v_revenue, bdsp_commission, buyer_confirmed_at, logistics_confirmed_at, seller_confirmed_at`,
      [req.params.dealId],
    );

    res.locals.auditAction = `Deposited funds for deal ${req.params.dealId}`;
    res.json({ deal: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// PATCH /deals/:dealId/confirm/buyer — buyer confirms receipt
router.patch('/:dealId/confirm/buyer', requireAuth, async (req, res, next) => {
  try {
    const result = await transaction(async (client) => {
      const deal = (await client.query('SELECT * FROM deals WHERE deal_id = $1', [req.params.dealId])).rows[0];
      if (!deal) throw notFound('Deal not found');
      if (deal.buyer_user_id !== req.user.user_id) throw forbidden('Only the buyer can confirm receipt');
      if (deal.escrow_status !== 'Funds-Held-Placeholder') throw badRequest('Deal must be in Funds-Held-Placeholder status');
      if (deal.buyer_confirmed_at) throw badRequest('Buyer already confirmed');

      await client.query(
        'UPDATE deals SET buyer_confirmed_at = now() WHERE deal_id = $1',
        [req.params.dealId],
      );

      res.locals.auditAction = `Buyer confirmed receipt for deal ${req.params.dealId}`;
      return tryAutoRelease(client, req.params.dealId);
    });

    res.json({ deal: result });
  } catch (error) {
    next(error);
  }
});

// PATCH /deals/:dealId/confirm/logistics — logistics confirms delivery
router.patch('/:dealId/confirm/logistics', requireAuth, async (req, res, next) => {
  try {
    const result = await transaction(async (client) => {
      const deal = (await client.query('SELECT * FROM deals WHERE deal_id = $1', [req.params.dealId])).rows[0];
      if (!deal) throw notFound('Deal not found');
      if (deal.logistics_user_id !== req.user.user_id) throw forbidden('Only the logistics partner can confirm delivery');
      if (deal.escrow_status !== 'Funds-Held-Placeholder') throw badRequest('Deal must be in Funds-Held-Placeholder status');
      if (deal.logistics_confirmed_at) throw badRequest('Logistics already confirmed');

      await client.query(
        'UPDATE deals SET logistics_confirmed_at = now() WHERE deal_id = $1',
        [req.params.dealId],
      );

      res.locals.auditAction = `Logistics confirmed delivery for deal ${req.params.dealId}`;
      return tryAutoRelease(client, req.params.dealId);
    });

    res.json({ deal: result });
  } catch (error) {
    next(error);
  }
});

// PATCH /deals/:dealId/confirm/seller — seller confirms dispatch
router.patch('/:dealId/confirm/seller', requireAuth, async (req, res, next) => {
  try {
    const result = await transaction(async (client) => {
      const deal = (await client.query('SELECT * FROM deals WHERE deal_id = $1', [req.params.dealId])).rows[0];
      if (!deal) throw notFound('Deal not found');
      if (!deal.seller_user_ids.includes(req.user.user_id)) throw forbidden('Only a seller can confirm dispatch');
      if (deal.escrow_status !== 'Funds-Held-Placeholder') throw badRequest('Deal must be in Funds-Held-Placeholder status');
      if (deal.seller_confirmed_at) throw badRequest('Seller already confirmed');

      await client.query(
        'UPDATE deals SET seller_confirmed_at = now() WHERE deal_id = $1',
        [req.params.dealId],
      );

      res.locals.auditAction = `Seller confirmed dispatch for deal ${req.params.dealId}`;
      return tryAutoRelease(client, req.params.dealId);
    });

    res.json({ deal: result });
  } catch (error) {
    next(error);
  }
});

// PATCH /deals/:dealId/cancel — BDSP cancels deal
router.patch('/:dealId/cancel', requireBdsp, async (req, res, next) => {
  try {
    const deal = (await query('SELECT * FROM deals WHERE deal_id = $1', [req.params.dealId])).rows[0];
    if (!deal) throw notFound('Deal not found');
    if (deal.bdsp_user_id !== req.user.user_id) throw forbidden('Only the managing BDSP can cancel this deal');
    if (deal.escrow_status === 'Released') throw badRequest('Cannot cancel a released deal');

    const result = await query(
      `UPDATE deals SET escrow_status = 'Cancelled' WHERE deal_id = $1
       RETURNING deal_id, hub_id, bdsp_user_id, buyer_user_id, seller_user_ids,
                 logistics_user_id, deal_value, escrow_status, insurance_status,
                 v4v_revenue, bdsp_commission, buyer_confirmed_at, logistics_confirmed_at, seller_confirmed_at`,
      [req.params.dealId],
    );

    res.locals.auditAction = `Cancelled deal ${req.params.dealId}`;
    res.json({ deal: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
