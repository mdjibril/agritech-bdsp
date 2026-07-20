const express = require('express');
const { query, transaction } = require('../../db');
const { requireAuth, requireRole } = require('../../middleware/auth');
const { badRequest, notFound, forbidden } = require('../../httpError');
const { calculateFinancials } = require('../../services/financials');

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

  return {
    deal_id: `TXN_${String(tx.tx_id).padStart(3, '0')}`,
    hub_id: `HUB_${String(tx.seller_id).padStart(3, '0')}`,
    item_name: tx.commodity,
    category: 'Crop',
    deal_value: Number(tx.total_amount),
    escrow_status: escrowStatus,
    insurance_status: 'Certificate-Issued-Placeholder',
    buyer_user_id: String(tx.buyer_id),
    seller_user_ids: [String(tx.seller_id)],
    logistics_user_id: tx.logistics_id ? String(tx.logistics_id) : null,
    bdsp_user_id: tx.bdsp_id ? String(tx.bdsp_id) : String(tx.seller_id),
    buyer_confirmed_at: tx.buyer_pod_confirmed ? tx.updated_at : null,
    logistics_confirmed_at: tx.trucker_pod_confirmed ? tx.updated_at : null,
    seller_confirmed_at: tx.created_at,
    // Phase 7 financial breakdown
    base_amount: Number(tx.total_amount),
    logistics_fee: Number(tx.logistics_fee || 0),
    insurance_premium: Number(tx.insurance_premium || 0),
    marketplace_fee: Number(tx.marketplace_fee || 0),
    logistics_coordination_fee: Number(tx.logistics_coordination_fee || 0),
    total_invoice: Number(tx.total_amount) + Number(tx.logistics_fee || 0)
      + Number(tx.insurance_premium || 0) + Number(tx.marketplace_fee || 0)
      + Number(tx.logistics_coordination_fee || 0),
    v4v_revenue: Number(tx.commission_v4v || 0),
    bdsp_commission: Number(tx.commission_bdsp || 0),
    insurance_provider_share: Number(tx.insurance_provider_share || 0),
    gateway_reserve: Number(tx.gateway_reserve || 0),
    operations_reserve: Number(tx.operations_reserve || 0),
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
    if (req.user.actor_type !== 'BDSP' && req.user.actor_type !== 'V4V_ADMIN') {
      return res.status(403).json({ error: 'BDSP or V4V Admin role required' });
    }
    const isAdmin = req.user.actor_type === 'V4V_ADMIN';
    const result = await query(
      isAdmin
        ? `${DEAL_SELECT} WHERE seller.bdsp_id IS NOT NULL ORDER BY t.tx_id DESC`
        : `${DEAL_SELECT} WHERE seller.bdsp_id = $1 ORDER BY t.tx_id DESC`,
      isAdmin ? [] : [req.user.actor_id]
    );
    res.json({ deals: result.rows.map(mapDeal) });
  } catch (err) {
    next(err);
  }
});

// GET /deals/my — User's transactions as participant (BDSP sees downline, admin sees all)
router.get('/my', requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      `${DEAL_SELECT} WHERE $1 IN (t.buyer_id, t.seller_id, t.logistics_id)
       OR (seller.bdsp_id = $1)
       OR ($2)
       ORDER BY t.tx_id DESC`,
      [req.user.actor_id, req.user.actor_type === 'V4V_ADMIN']
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

// PATCH /deals/:dealId/assign-logistics — BDSP assigns a logistics partner to the deal
router.patch('/:dealId/assign-logistics', requireAuth, async (req, res, next) => {
  try {
    const txId = Number(req.params.dealId.replace(/^TXN_0*/, ''));
    if (!req.body.logistics_id) return next(badRequest('logistics_id is required'));
    const tx = (await query('SELECT * FROM transactions WHERE tx_id = $1', [txId])).rows[0];
    if (!tx) return next(notFound('Deal not found'));
    if (tx.status === 'COMPLETED' || tx.status === 'DISPUTED') return next(badRequest('Cannot assign logistics to a completed or disputed deal'));

    const logisticsId = Number(req.body.logistics_id);
    await query('UPDATE transactions SET logistics_id = $1 WHERE tx_id = $2', [logisticsId, txId]);
    res.locals.auditAction = `Legacy assign logistics ${logisticsId} to transaction ${txId}`;
    res.json({ message: 'Logistics assigned', logistics_id: String(logisticsId) });
  } catch (err) {
    next(err);
  }
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
        const totalAmount  = Number(tx.total_amount || 0);
        const logisticsFee = Number(tx.logistics_fee || 0);
        const f = calculateFinancials({ itemPrice: totalAmount, logisticsFee });

        if (f.sellerPayout > 0) {
          await client.query(
            'UPDATE actors SET wallet_balance = wallet_balance + $1 WHERE actor_id = $2',
            [f.sellerPayout, tx.seller_id]
          );
        }
        if (f.logisticsPayout > 0 && tx.logistics_id) {
          await client.query(
            'UPDATE actors SET wallet_balance = wallet_balance + $1 WHERE actor_id = $2',
            [f.logisticsPayout, tx.logistics_id]
          );
        }

        const seller = await client.query('SELECT bdsp_id FROM actors WHERE actor_id = $1', [tx.seller_id]);
        const bdspId = seller.rows[0]?.bdsp_id;
        if (f.bdspInsuranceShare > 0) {
          if (bdspId && bdspId !== 25) {
            // Normal BDSP gets the BDSP share
            await client.query(
              'UPDATE actors SET wallet_balance = wallet_balance + $1 WHERE actor_id = $2',
              [f.bdspInsuranceShare, bdspId]
            );
          } else {
            // Self-enrolled SHF (bdsp_id = 25): 80% to V4V Admin, 20% to operations reserve
            const v4vSplit = Math.round(f.bdspInsuranceShare * 0.80 * 100) / 100;
            const opsSplit = f.bdspInsuranceShare - v4vSplit;
            await client.query(
              'UPDATE actors SET wallet_balance = wallet_balance + $1 WHERE actor_id = 25',
              [v4vSplit]
            );
            await client.query(
              'UPDATE transactions SET operations_reserve = operations_reserve + $1 WHERE tx_id = $2',
              [opsSplit, txId]
            );
          }
        }

        await client.query(
          'UPDATE transactions SET commission_v4v = $1, commission_bdsp = $2 WHERE tx_id = $3',
          [f.v4vAdminTotal, f.bdspInsuranceShare, txId]
        );

        await client.query(
          'UPDATE actors SET wallet_balance = wallet_balance + $1 WHERE actor_id = 25',
          [f.v4vAdminTotal + f.insuranceProviderShare + f.gatewayReserve + f.operationsReserve]
        );
      }
    });
  }
}

module.exports = router;
