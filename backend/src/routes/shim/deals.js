const express = require('express');
const { query, transaction } = require('../../db');
const { requireAuth, requireRole } = require('../../middleware/auth');
const { badRequest, notFound, forbidden } = require('../../httpError');

const router = express.Router();

const ESCROW_MAP = {
  'INITIATED': 'Funds-Held-Placeholder',
  'IN_ESCROW': 'Funds-Held-Placeholder',
  'DISPATCHED': 'Funds-Held-Placeholder',
  'DELIVERED': 'Funds-Held-Placeholder',
  'COMPLETED': 'Released',
  'DISPUTED': 'Cancelled',
};

function mapDeal(tx) {
  const escrowStatus = ESCROW_MAP[tx.status] || 'Funds-Held-Placeholder';
  const released = tx.status === 'COMPLETED';

  return {
    deal_id: `TXN_${String(tx.tx_id).padStart(3, '0')}`,
    hub_id: `HUB_${String(tx.seller_id).padStart(3, '0')}`,
    item_name: tx.commodity,
    category: 'Crop',
    deal_value: Number(tx.total_amount),
    escrow_status: escrowStatus,
    insurance_status: 'Certificate-Issued-Placeholder',
    buyer_user_id: `ACT_${String(tx.buyer_id).padStart(3, '0')}`,
    seller_user_ids: [`ACT_${String(tx.seller_id).padStart(3, '0')}`],
    logistics_user_id: tx.logistics_id ? `ACT_${String(tx.logistics_id).padStart(3, '0')}` : null,
    bdsp_user_id: tx.bdsp_id ? `ACT_${String(tx.bdsp_id).padStart(3, '0')}` : `ACT_${String(tx.seller_id).padStart(3, '0')}`,
    buyer_confirmed_at: tx.buyer_pod_confirmed ? tx.updated_at : null,
    logistics_confirmed_at: tx.trucker_pod_confirmed ? tx.updated_at : null,
    seller_confirmed_at: tx.created_at,
    v4v_revenue: Number(tx.commission_v4v || 0),
    bdsp_commission: Number(tx.commission_bdsp || 0),
  };
}

const DEAL_SELECT = `
  SELECT t.*,
         seller.bdsp_id
  FROM transactions t
  JOIN actors seller ON seller.actor_id = t.seller_id`;

// GET /deals — BDSP's managed deals (transactions where seller's bdsp_id = BDSP)
router.get('/', requireAuth, async (req, res, next) => {
  try {
    if (req.user.actor_type !== 'BDSP') {
      return res.status(403).json({ error: 'BDSP role required' });
    }
    const result = await query(
      `${DEAL_SELECT} WHERE seller.bdsp_id = $1 ORDER BY t.tx_id DESC`,
      [req.user.actor_id]
    );
    res.json({ deals: result.rows.map(mapDeal) });
  } catch (err) {
    next(err);
  }
});

// GET /deals/my — User's transactions as participant
router.get('/my', requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      `${DEAL_SELECT} WHERE $1 IN (t.buyer_id, t.seller_id, t.logistics_id)
       ORDER BY t.tx_id DESC`,
      [req.user.actor_id]
    );
    res.json({ deals: result.rows.map(mapDeal) });
  } catch (err) {
    next(err);
  }
});

// GET /deals/:dealId
router.get('/:dealId', requireAuth, async (req, res, next) => {
  try {
    const txId = Number(req.params.dealId.replace(/^TXN_0*/, ''));
    const result = await query(`${DEAL_SELECT} WHERE t.tx_id = $1`, [txId]);
    if (!result.rows.length) return next(notFound('Deal not found'));
    res.json({ deal: mapDeal(result.rows[0]) });
  } catch (err) {
    next(err);
  }
});

// PATCH /deals/:dealId/deposit — BDSP deposits escrow funds
router.patch('/:dealId/deposit', requireAuth, async (req, res, next) => {
  try {
    const txId = Number(req.params.dealId.replace(/^TXN_0*/, ''));
    const escrowResult = await query(
      `INSERT INTO escrow (tx_id, amount, funded_by, status)
       SELECT t.tx_id, t.total_amount, t.buyer_id, 'HELD'
       FROM transactions t WHERE t.tx_id = $1 AND t.status = 'INITIATED'
       ON CONFLICT (tx_id) DO NOTHING
       RETURNING *`,
      [txId]
    );
    if (!escrowResult.rows.length) {
      const tx = (await query('SELECT status FROM transactions WHERE tx_id = $1', [txId])).rows[0];
      if (!tx) return next(notFound('Deal not found'));
      return next(badRequest(`Cannot deposit: transaction is ${tx.status}`));
    }
    await query("UPDATE transactions SET status = 'IN_ESCROW' WHERE tx_id = $1", [txId]);
    res.locals.auditAction = `Legacy deposit for transaction ${txId}`;
    res.json({ message: 'Escrow funded', escrow: escrowResult.rows[0] });
  } catch (err) {
    next(err);
  }
});

// PATCH /deals/:dealId/confirm/buyer — Buyer confirms POD
router.patch('/:dealId/confirm/buyer', requireAuth, async (req, res, next) => {
  try {
    const txId = Number(req.params.dealId.replace(/^TXN_0*/, ''));
    const tx = (await query('SELECT * FROM transactions WHERE tx_id = $1', [txId])).rows[0];
    if (!tx) return next(notFound('Deal not found'));
    if (req.user.actor_id !== tx.buyer_id) return next(forbidden('Only the buyer can confirm'));

    await query("UPDATE transactions SET buyer_pod_confirmed = TRUE WHERE tx_id = $1", [txId]);
    await tryAutoRelease(txId);
    res.locals.auditAction = `Legacy buyer confirm for transaction ${txId}`;
    res.json({ message: 'Buyer confirmed' });
  } catch (err) {
    next(err);
  }
});

// PATCH /deals/:dealId/confirm/logistics — Logistics confirms POD
router.patch('/:dealId/confirm/logistics', requireAuth, async (req, res, next) => {
  try {
    const txId = Number(req.params.dealId.replace(/^TXN_0*/, ''));
    const tx = (await query('SELECT * FROM transactions WHERE tx_id = $1', [txId])).rows[0];
    if (!tx) return next(notFound('Deal not found'));
    if (!tx.logistics_id || req.user.actor_id !== tx.logistics_id) return next(forbidden('Only the assigned logistics can confirm'));

    await query("UPDATE transactions SET trucker_pod_confirmed = TRUE, status = 'DISPATCHED' WHERE tx_id = $1", [txId]);
    await tryAutoRelease(txId);
    res.locals.auditAction = `Legacy logistics confirm for transaction ${txId}`;
    res.json({ message: 'Logistics confirmed' });
  } catch (err) {
    next(err);
  }
});

// PATCH /deals/:dealId/confirm/seller — Seller confirms dispatch (no direct equivalent, stub)
router.patch('/:dealId/confirm/seller', requireAuth, async (req, res, next) => {
  res.json({ message: 'Seller confirmed' });
});

// PATCH /deals/:dealId/cancel — Cancel deal
router.patch('/:dealId/cancel', requireAuth, async (req, res, next) => {
  try {
    const txId = Number(req.params.dealId.replace(/^TXN_0*/, ''));
    const tx = (await query('SELECT * FROM transactions WHERE tx_id = $1', [txId])).rows[0];
    if (!tx) return next(notFound('Deal not found'));
    if (tx.status === 'COMPLETED') return next(badRequest('Cannot cancel completed deal'));

    await transaction(async (client) => {
      await client.query(
        "UPDATE escrow SET status = 'REFUNDED_TO_BUYER', released_at = NOW() WHERE tx_id = $1 AND status = 'HELD'",
        [txId]
      );
      await client.query("UPDATE transactions SET status = 'DISPUTED' WHERE tx_id = $1", [txId]);
    });
    res.locals.auditAction = `Legacy cancel for transaction ${txId}`;
    res.json({ message: 'Deal cancelled' });
  } catch (err) {
    next(err);
  }
});

async function tryAutoRelease(txId) {
  const tx = (await query('SELECT * FROM transactions WHERE tx_id = $1', [txId])).rows[0];
  if (tx.trucker_pod_confirmed && tx.buyer_pod_confirmed) {
    await transaction(async (client) => {
      const escrow = await client.query(
        "UPDATE escrow SET status = 'RELEASED_TO_SELLER', released_at = NOW() WHERE tx_id = $1 AND status = 'HELD' RETURNING amount",
        [txId]
      );
      await client.query("UPDATE transactions SET status = 'COMPLETED' WHERE tx_id = $1", [txId]);
      if (escrow.rows.length) {
        await client.query(
          'UPDATE actors SET wallet_balance = wallet_balance + $1 WHERE actor_id = (SELECT seller_id FROM transactions WHERE tx_id = $2)',
          [escrow.rows[0].amount, txId]
        );
      }
    });
  }
}

module.exports = router;
