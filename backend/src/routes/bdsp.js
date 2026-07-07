const express = require('express');
const { query } = require('../db');
const { requireBdsp } = require('../middleware/auth');

const router = express.Router();

router.get('/network', requireBdsp, async (req, res, next) => {
  try {
    const [members, posts, deals] = await Promise.all([
      query(
        `SELECT nm.network_id, nm.joined_at,
                u.user_id, u.full_name, u.phone, u.primary_role, u.secondary_roles,
                u.gender, u.lga, u.ward, u.crops, u.livestock, u.inputs_sold
         FROM network_members nm
         JOIN users u ON u.user_id = nm.member_user_id
         WHERE nm.bdsp_user_id = $1
         ORDER BY nm.joined_at DESC`,
        [req.user.user_id],
      ),
      query(
        `SELECT p.status, p.category, COUNT(*)::int AS count
         FROM posts p
         WHERE p.user_id IN (
           SELECT member_user_id FROM network_members WHERE bdsp_user_id = $1
         )
         GROUP BY p.status, p.category
         ORDER BY p.status, p.category`,
        [req.user.user_id],
      ),
      query(
        `SELECT COUNT(*)::int AS deal_count,
                COALESCE(SUM(deal_value), 0)::numeric AS total_deal_value,
                COALESCE(SUM(v4v_revenue), 0)::numeric AS total_v4v_revenue,
                COALESCE(SUM(bdsp_commission), 0)::numeric AS total_bdsp_commission
         FROM deals
         WHERE bdsp_user_id = $1`,
        [req.user.user_id],
      ),
    ]);

    const genderCounts = members.rows.reduce((counts, member) => {
      counts[member.gender] = (counts[member.gender] || 0) + 1;
      return counts;
    }, {});

    res.json({
      bdsp_user_id: req.user.user_id,
      metrics: {
        member_count: members.rowCount,
        gender_counts: genderCounts,
        post_summary: posts.rows,
        commission_ledger: deals.rows[0],
      },
      members: members.rows,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
