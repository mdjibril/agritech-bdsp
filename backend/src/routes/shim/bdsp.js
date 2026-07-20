const express = require('express');
const { query } = require('../../db');
const { requireAuth } = require('../../middleware/auth');

const router = express.Router();

// GET /bdsp/network — BDSP / V4V_ADMIN network view
router.get('/network', requireAuth, async (req, res, next) => {
  try {
    const isAdmin = req.user.actor_type === 'V4V_ADMIN';
    if (req.user.actor_type !== 'BDSP' && !isAdmin) {
      return res.status(403).json({ error: 'BDSP or V4V Admin role required' });
    }

    // V4V_ADMIN sees all BDSPs' networks; BDSP sees only their own
    const bdspFilter = isAdmin
      ? 'a.bdsp_id IN (SELECT actor_id FROM actors WHERE actor_type = \'BDSP\')'
      : 'a.bdsp_id = $1';

    const queryParams = isAdmin ? [] : [req.user.actor_id];
    const placeholderIdx = isAdmin ? '' : '$1';

    const members = await query(
      `SELECT a.actor_id, a.actor_type, a.full_name, a.phone, a.gender,
              a.lga, a.state, a.kyc_status, a.created_at, a.bdsp_id,
              b.full_name AS bdsp_name
       FROM actors a
       LEFT JOIN actors b ON b.actor_id = a.bdsp_id
       WHERE ${bdspFilter}
       ORDER BY a.created_at DESC`,
      queryParams
    );

    // Gender counts
    const gender_counts = {};
    for (const m of members.rows) {
      const g = m.gender || 'OTHER';
      gender_counts[g] = (gender_counts[g] || 0) + 1;
    }

    const sellerIds = members.rows.map(m => m.actor_id);

    // Real commodity data: get distinct commodities each SHF has traded
    let commoditiesByActor = {};
    if (sellerIds.length) {
      const commResult = await query(
        `SELECT seller_id, commodity, COUNT(*)::int AS tx_count
         FROM transactions WHERE seller_id = ANY($1::int[]) GROUP BY seller_id, commodity
         ORDER BY seller_id, tx_count DESC`,
        [sellerIds]
      );
      for (const row of commResult.rows) {
        if (!commoditiesByActor[row.seller_id]) commoditiesByActor[row.seller_id] = [];
        commoditiesByActor[row.seller_id].push(row.commodity);
      }
    }

    // Real listing counts per SHF
    let listingCounts = {};
    if (sellerIds.length) {
      const listResult = await query(
        `SELECT seller_id, COUNT(*)::int AS active_count
         FROM transactions WHERE seller_id = ANY($1::int[])
         AND status IN ('LISTED', 'INITIATED', 'IN_ESCROW', 'DISPATCHED') GROUP BY seller_id`,
        [sellerIds]
      );
      for (const row of listResult.rows) {
        listingCounts[row.seller_id] = row.active_count;
      }
    }
    const totalActive = Object.values(listingCounts).reduce((s, c) => s + c, 0);

    // Commission ledger from linked sellers' transactions
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
         FROM transactions WHERE seller_id = ANY($1::int[]) AND status = 'COMPLETED'`,
        [sellerIds]
      );
      commission_ledger = ledger.rows[0];
    }

    res.json({
      members: members.rows.map(m => ({
        user_id: m.actor_id,
        full_name: m.full_name,
        phone: m.phone,
        primary_role: m.actor_type,
        is_bdsp: m.actor_type === 'BDSP',
        gender: m.gender ? m.gender.charAt(0).toUpperCase() + m.gender.slice(1).toLowerCase() : 'Other',
        lga: m.lga,
        ward: m.lga,
        kyc_status: m.kyc_status,
        commodities: commoditiesByActor[m.actor_id] || [],
        listing_count: listingCounts[m.actor_id] || 0,
        joined_at: m.created_at,
        bdsp_name: m.bdsp_name || null,
      })),
      metrics: {
        member_count: members.rows.length,
        gender_counts,
        active_listings: totalActive,
        commission_ledger,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
