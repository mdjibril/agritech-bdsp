const express = require('express');
const { query } = require('../../db');
const { requireAuth } = require('../../middleware/auth');
const { notFound } = require('../../httpError');

const router = express.Router();

// GET /api/v1/actors — List all actors (V4V_ADMIN and KBS only)
router.get('/', requireAuth, async (req, res, next) => {
  try {
    if (!['V4V_ADMIN', 'KBS'].includes(req.user.actor_type)) {
      return res.status(403).json({ error: 'Admin or KBS role required' });
    }
    const result = await query(
      'SELECT actor_id, actor_type, full_name, phone, channel, kyc_status, gender, lga, state, bdsp_id, wallet_balance, created_at FROM actors ORDER BY created_at DESC'
    );
    res.json({ actors: result.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/actors/:id — Profile
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      'SELECT actor_id, actor_type, full_name, phone, channel, bank_name, account_number, state, lga, gps_lat, gps_lng, kyc_status, gender, bdsp_id, wallet_balance, created_at FROM actors WHERE actor_id = $1',
      [Number(req.params.id)]
    );
    if (!result.rows.length) return next(notFound('Actor not found'));
    res.json({ actor: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/actors/network — BDSP's downline network
router.get('/network', requireAuth, async (req, res, next) => {
  try {
    if (req.user.actor_type !== 'BDSP') {
      return res.status(403).json({ error: 'BDSP role required' });
    }
    const members = await query(
      `SELECT actor_id, actor_type, full_name, phone, channel, kyc_status, gender, lga, state, wallet_balance, created_at
       FROM actors WHERE bdsp_id = $1 ORDER BY created_at DESC`,
      [req.user.actor_id]
    );

    // Aggregate metrics
    const genderCounts = {};
    const typeCounts = {};
    for (const m of members.rows) {
      const g = m.gender || 'OTHER';
      genderCounts[g] = (genderCounts[g] || 0) + 1;
      typeCounts[m.actor_type] = (typeCounts[m.actor_type] || 0) + 1;
    }

    // Commission from linked sellers' transactions
    const sellerIds = members.rows.map(m => m.actor_id);
    let commissionLedger = { total_tx_value: 0, tx_count: 0, total_commission_v4v: 0, total_commission_bdsp: 0 };
    if (sellerIds.length) {
      const ledger = await query(
        `SELECT COUNT(*)::int AS tx_count, COALESCE(SUM(total_amount), 0)::numeric AS total_tx_value,
                COALESCE(SUM(commission_v4v), 0)::numeric AS total_commission_v4v,
                COALESCE(SUM(commission_bdsp), 0)::numeric AS total_commission_bdsp
         FROM transactions WHERE seller_id = ANY($1::int[])`,
        [sellerIds]
      );
      commissionLedger = ledger.rows[0];
    }

    res.json({
      members: members.rows,
      metrics: {
        member_count: members.rows.length,
        gender_counts: genderCounts,
        type_counts: typeCounts,
        commission_ledger: commissionLedger,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
