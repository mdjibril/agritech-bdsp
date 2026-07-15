const express = require('express');
const { query, transaction } = require('../../db');
const { requireFields } = require('../../validation');
const { requireAuth, requireRole } = require('../../middleware/auth');
const { badRequest, forbidden, notFound } = require('../../httpError');

const router = express.Router();

// Shared transaction SELECT with actor names
const TX_SELECT = `
  SELECT t.tx_id, t.buyer_id, t.seller_id, t.logistics_id,
         t.commodity, t.quantity_kg, t.unit_price, t.total_amount,
         t.status, t.trucker_pod_confirmed, t.buyer_pod_confirmed,
         t.escrow_required, t.commission_v4v, t.commission_bdsp,
         t.created_at, t.updated_at,
         buyer.full_name AS buyer_name,
         seller.full_name AS seller_name,
         logistics.full_name AS logistics_name
  FROM transactions t
  JOIN actors buyer ON buyer.actor_id = t.buyer_id
  JOIN actors seller ON seller.actor_id = t.seller_id
  LEFT JOIN actors logistics ON logistics.actor_id = t.logistics_id`;

// POST /api/v1/transactions
// Creates a transaction and atomically funds escrow if escrow_required
router.post('/', requireAuth, async (req, res, next) => {
  try {
    requireFields(req.body, 'buyer_id', 'seller_id', 'commodity', 'quantity_kg', 'unit_price');
    if (req.user.actor_type !== 'BDSP' && Number(req.user.actor_id) !== Number(req.body.buyer_id) && Number(req.user.actor_id) !== Number(req.body.seller_id)) {
      return next(forbidden('Only BDSP or a party to the transaction can create it'));
    }

    const result = await transaction(async (client) => {
      // 1. Insert transaction — total_amount, escrow_required, commissions auto-computed
      const tx = await client.query(
        `INSERT INTO transactions (buyer_id, seller_id, logistics_id, commodity, quantity_kg, unit_price)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          Number(req.body.buyer_id),
          Number(req.body.seller_id),
          req.body.logistics_id ? Number(req.body.logistics_id) : null,
          req.body.commodity,
          req.body.quantity_kg,
          req.body.unit_price,
        ]
      );
      const transaction = tx.rows[0];

      // 2. If escrow is required, create escrow record atomically
      if (transaction.escrow_required) {
        await client.query(
          `INSERT INTO escrow (tx_id, amount, funded_by, status)
           VALUES ($1, $2, $3, 'HELD')`,
          [transaction.tx_id, transaction.total_amount, transaction.buyer_id]
        );
        // Update transaction status to IN_ESCROW
        await client.query(
          "UPDATE transactions SET status = 'IN_ESCROW' WHERE tx_id = $1",
          [transaction.tx_id]
        );
        transaction.status = 'IN_ESCROW';
      }

      return transaction;
    });

    res.locals.auditAction = `Created transaction ${result.tx_id}: ${result.quantity_kg}kg ${result.commodity}`;
    res.status(201).json({ transaction: result });
  } catch (err) {
    if (err.code === '23503') return next(badRequest('Referenced actor does not exist'));
    next(err);
  }
});

// GET /api/v1/transactions
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      `${TX_SELECT} WHERE $1 IN (t.buyer_id, t.seller_id, t.logistics_id)
       ORDER BY t.created_at DESC LIMIT 100`,
      [req.user.actor_id]
    );
    res.json({ transactions: result.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/transactions/:id
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      `${TX_SELECT} WHERE t.tx_id = $1`,
      [Number(req.params.id)]
    );
    if (!result.rows.length) return next(notFound('Transaction not found'));
    const tx = result.rows[0];
    if (req.user.actor_id !== tx.buyer_id && req.user.actor_id !== tx.seller_id &&
        req.user.actor_id !== tx.logistics_id && req.user.actor_type !== 'V4V_ADMIN') {
      return next(forbidden('Not a participant in this transaction'));
    }
    res.json({ transaction: tx });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/transactions/:id/confirm-pod
// Dual-lock POD: body { role: 'trucker' | 'buyer' }
router.post('/:id/confirm-pod', requireAuth, async (req, res, next) => {
  try {
    requireFields(req.body, 'role');
    if (!['trucker', 'buyer'].includes(req.body.role)) {
      return next(badRequest('Role must be "trucker" or "buyer"'));
    }

    const txResult = await query('SELECT * FROM transactions WHERE tx_id = $1', [Number(req.params.id)]);
    if (!txResult.rows.length) return next(notFound('Transaction not found'));
    const tx = txResult.rows[0];

    // Authorize: trucker must match logistics_id, buyer must match buyer_id
    if (req.body.role === 'trucker') {
      if (!tx.logistics_id || req.user.actor_id !== tx.logistics_id) {
        return next(forbidden('Only the assigned logistics partner can confirm trucker POD'));
      }
      await query('UPDATE transactions SET trucker_pod_confirmed = TRUE, status = \'DISPATCHED\' WHERE tx_id = $1', [tx.tx_id]);
      res.locals.auditAction = `Trucker confirmed POD for transaction ${tx.tx_id}`;
    } else {
      if (req.user.actor_id !== tx.buyer_id) {
        return next(forbidden('Only the buyer can confirm buyer POD'));
      }
      await query('UPDATE transactions SET buyer_pod_confirmed = TRUE WHERE tx_id = $1', [tx.tx_id]);
      res.locals.auditAction = `Buyer confirmed POD for transaction ${tx.tx_id}`;
    }

    // Check if both confirmed — atomic release
    const updated = (await query('SELECT * FROM transactions WHERE tx_id = $1', [tx.tx_id])).rows[0];
    if (updated.trucker_pod_confirmed && updated.buyer_pod_confirmed) {
      await transaction(async (client) => {
        const escrowResult = await client.query(
          "UPDATE escrow SET status = 'RELEASED_TO_SELLER', released_at = NOW() WHERE tx_id = $1 AND status = 'HELD' RETURNING amount",
          [tx.tx_id]
        );
        await client.query(
          "UPDATE transactions SET status = 'COMPLETED' WHERE tx_id = $1",
          [tx.tx_id]
        );
        if (escrowResult.rows.length) {
          await client.query(
            'UPDATE actors SET wallet_balance = wallet_balance + $1 WHERE actor_id = (SELECT seller_id FROM transactions WHERE tx_id = $2)',
            [escrowResult.rows[0].amount, tx.tx_id]
          );
        }
      });
      res.locals.auditAction = `Escrow released for transaction ${tx.tx_id} (dual POD complete)`;
    }

    const final = (await query(`${TX_SELECT} WHERE t.tx_id = $1`, [tx.tx_id])).rows[0];
    res.json({ transaction: final, message: 'POD confirmed' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
