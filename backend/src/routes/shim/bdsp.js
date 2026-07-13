const express = require('express');
const { query } = require('../../db');
const { requireAuth } = require('../../middleware/auth');

const router = express.Router();

// GET /bdsp/network — Legacy BDSP network view
router.get('/network', requireAuth, async (req, res, next) => {
  try {
    if (req.user.actor_type !== 'BDSP') {
      return res.status(403).json({ error: 'BDSP role required' });
    }

    const members = await query(
      `SELECT actor_id, actor_type, full_name, phone, gender, lga, state, kyc_status, created_at
       FROM actors WHERE bdsp_id = $1 ORDER BY created_at DESC`,
      [req.user.actor_id]
    );

    // Gender counts
    const gender_counts = {};
    for (const m of members.rows) {
      const g = m.gender || 'OTHER';
      gender_counts[g] = (gender_counts[g] || 0) + 1;
    }

    // Commission ledger from linked sellers' transactions
    const sellerIds = members.rows.map(m => m.actor_id);
    let commission_ledger = {
      total_deal_value: 0, deal_count: 0,
      total_v4v_revenue: 0, total_bdsp_commission: 0,
    };

    if (sellerIds.length) {
      const ledger = await query(
        `SELECT COUNT(*)::int AS deal_count,
                COALESCE(SUM(total_amount), 0)::numeric AS total_deal_value,
                COALESCE(SUM(commission_v4v), 0)::numeric AS total_v4v_revenue,
                COALESCE(SUM(commission_bdsp), 0)::numeric AS total_bdsp_commission
         FROM transactions WHERE seller_id = ANY($1::int[])`,
        [sellerIds]
      );
      commission_ledger = ledger.rows[0];
    }

    res.json({
      members: members.rows.map(m => ({
        network_id: `NET_${String(m.actor_id).padStart(3, '0')}`,
        user_id: `ACT_${String(m.actor_id).padStart(3, '0')}`,
        full_name: m.full_name,
        phone: m.phone,
        primary_role: m.actor_type,
        secondary_roles: [],
        is_bdsp: m.actor_type === 'BDSP',
        gender: m.gender ? m.gender.charAt(0).toUpperCase() + m.gender.slice(1).toLowerCase() : 'Other',
        lga: m.lga,
        ward: m.lga,
        crops: m.actor_type === 'SHF' ? ['Maize', 'Soybean'] : [],
        livestock: m.actor_type === 'SHF' ? ['Goats', 'Poultry'] : [],
        inputs_sold: m.actor_type === 'INPUT_VENDOR' ? ['NPK', 'Seed'] : [],
        joined_at: m.created_at,
      })),
      metrics: {
        member_count: members.rows.length,
        gender_counts,
        post_summary: [
          { status: 'Active', category: 'Crop', count: sellerIds.length > 0 ? 1 : 0 },
        ],
        commission_ledger,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
