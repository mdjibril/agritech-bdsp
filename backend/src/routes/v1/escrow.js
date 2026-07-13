const express = require('express');
const { query, transaction } = require('../../db');
const { requireFields } = require('../../validation');
const { requireAuth, requireRole } = require('../../middleware/auth');
const { badRequest, forbidden, notFound } = require('../../httpError');

const router = express.Router();

// POST /api/v1/escrow — Fund escrow for a transaction
router.post('/', requireAuth, async (req, res, next) => {
  try {
    requireFields(req.body, 'tx_id');
    const txResult = await query('SELECT * FROM transactions WHERE tx_id = $1', [Number(req.body.tx_id)]);
    if (!txResult.rows.length) return next(notFound('Transaction not found'));
    const tx = txResult.rows[0];

    if (req.user.actor_id !== tx.buyer_id && req.user.actor_type !== 'V4V_ADMIN') {
      return next(forbidden('Only the buyer can fund escrow'));
    }
    if (tx.status !== 'INITIATED') return next(badRequest('Transaction must be INITIATED to fund escrow'));

    const result = await query(
      `INSERT INTO escrow (tx_id, amount, funded_by, status)
       VALUES ($1, $2, $3, 'HELD')
       RETURNING *`,
      [tx.tx_id, tx.total_amount, req.user.actor_id]
    );
    await query("UPDATE transactions SET status = 'IN_ESCROW' WHERE tx_id = $1", [tx.tx_id]);

    res.locals.auditAction = `Escrow funded for transaction ${tx.tx_id}: ₦${tx.total_amount}`;
    res.status(201).json({ escrow: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/escrow/:id
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM escrow WHERE escrow_id = $1', [Number(req.params.id)]);
    if (!result.rows.length) return next(notFound('Escrow record not found'));
    res.json({ escrow: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/escrow/:id/release — V4V_ADMIN manual release override
router.patch('/:id/release', requireRole('V4V_ADMIN'), async (req, res, next) => {
  try {
    const result = await transaction(async (client) => {
      const escrow = await client.query(
        `UPDATE escrow SET status = 'RELEASED_TO_SELLER', released_at = NOW()
         WHERE escrow_id = $1 AND status = 'HELD'
         RETURNING *`,
        [Number(req.params.id)]
      );
      if (!escrow.rows.length) throw badRequest('Escrow not found or not in HELD status');
      await client.query(
        "UPDATE transactions SET status = 'COMPLETED' WHERE tx_id = $1",
        [escrow.rows[0].tx_id]
      );
      await client.query(
        'UPDATE actors SET wallet_balance = wallet_balance + $1 WHERE actor_id = (SELECT seller_id FROM transactions WHERE tx_id = $2)',
        [escrow.rows[0].amount, escrow.rows[0].tx_id]
      );
      return escrow.rows[0];
    });
    res.locals.auditAction = `Manual escrow release ${req.params.id}`;
    res.json({ escrow: result });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/escrow/:id/refund — V4V_ADMIN refund to buyer
router.patch('/:id/refund', requireRole('V4V_ADMIN'), async (req, res, next) => {
  try {
    const result = await transaction(async (client) => {
      const escrow = await client.query(
        `UPDATE escrow SET status = 'REFUNDED_TO_BUYER', released_at = NOW()
         WHERE escrow_id = $1 AND status = 'HELD'
         RETURNING *`,
        [Number(req.params.id)]
      );
      if (!escrow.rows.length) throw badRequest('Escrow not found or not in HELD status');
      await client.query(
        "UPDATE transactions SET status = 'DISPUTED' WHERE tx_id = $1",
        [escrow.rows[0].tx_id]
      );
      return escrow.rows[0];
    });
    res.locals.auditAction = `Escrow refunded to buyer ${req.params.id}`;
    res.json({ escrow: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
