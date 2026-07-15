const express = require('express');
const { query } = require('../../db');
const { requireAuth } = require('../../middleware/auth');
const { forbidden } = require('../../httpError');

const router = express.Router();

function requireRole(...roles) {
  return (req, _res, next) => {
    if (!roles.includes(req.user.actor_type)) return next(forbidden('Access denied'));
    next();
  };
}

// GET /api/v1/reports/completed-transactions
router.get('/completed-transactions', requireAuth, requireRole('KBS', 'AGRA', 'V4V_ADMIN'), async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    let sql = `
      SELECT t.tx_id, t.commodity, t.quantity_kg, t.unit_price, t.total_amount,
             t.commission_v4v, t.commission_bdsp, t.created_at, t.updated_at,
             buyer.full_name AS buyer_name, buyer.actor_id AS buyer_id,
             seller.full_name AS seller_name, seller.actor_id AS seller_id,
             logistics.full_name AS logistics_name
      FROM transactions t
      JOIN actors buyer ON buyer.actor_id = t.buyer_id
      JOIN actors seller ON seller.actor_id = t.seller_id
      LEFT JOIN actors logistics ON logistics.actor_id = t.logistics_id
      WHERE t.status = 'COMPLETED'`;
    const params = [];
    if (start_date) { params.push(start_date); sql += ` AND t.updated_at >= $${params.length}`; }
    if (end_date) { params.push(end_date); sql += ` AND t.updated_at <= $${params.length}`; }
    sql += ' ORDER BY t.updated_at DESC';

    const result = await query(sql, params);

    const summary = {
      total_count: result.rows.length,
      total_volume: Number(result.rows.reduce((s, r) => s + Number(r.quantity_kg || 0), 0).toFixed(2)),
      total_value: Number(result.rows.reduce((s, r) => s + Number(r.total_amount || 0), 0).toFixed(2)),
      total_v4v: Number(result.rows.reduce((s, r) => s + Number(r.commission_v4v || 0), 0).toFixed(2)),
      total_bdsp: Number(result.rows.reduce((s, r) => s + Number(r.commission_bdsp || 0), 0).toFixed(2)),
    };

    res.json({ summary, transactions: result.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/reports/farmer-participation
router.get('/farmer-participation', requireAuth, requireRole('KBS', 'V4V_ADMIN'), async (req, res, next) => {
  try {
    // All SHF actors
    const allShfs = await query(
      "SELECT actor_id, full_name, phone, gender, lga, state, created_at FROM actors WHERE actor_type = 'SHF' ORDER BY created_at DESC"
    );

    // SHFs who have completed at least one transaction as seller
    const activeIds = await query(
      'SELECT DISTINCT seller_id FROM transactions WHERE status = \'COMPLETED\''
    );
    const activeSet = new Set(activeIds.rows.map(r => Number(r.seller_id)));

    // Repeat sellers (completed >1 transaction)
    const repeatResult = await query(
      'SELECT seller_id, COUNT(*)::int AS tx_count FROM transactions WHERE status = \'COMPLETED\' GROUP BY seller_id HAVING COUNT(*) > 1'
    );
    const repeatSet = new Set(repeatResult.rows.map(r => Number(r.seller_id)));

    const farmers = allShfs.rows.map(f => ({
      actor_id: f.actor_id,
      full_name: f.full_name,
      phone: f.phone,
      gender: f.gender,
      lga: f.lga,
      state: f.state,
      registered_at: f.created_at,
      has_completed_sale: activeSet.has(Number(f.actor_id)),
      is_repeat_seller: repeatSet.has(Number(f.actor_id)),
    }));

    res.json({
      farmers,
      summary: {
        total_shfs: farmers.length,
        active_sellers: activeSet.size,
        repeat_sellers: repeatSet.size,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/reports/financial-summary — V4V_ADMIN only
router.get('/financial-summary', requireAuth, requireRole('V4V_ADMIN'), async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    let sql = 'SELECT status, COUNT(*)::int AS count, COALESCE(SUM(total_amount), 0)::numeric AS total_value, COALESCE(SUM(commission_v4v), 0)::numeric AS total_v4v, COALESCE(SUM(commission_bdsp), 0)::numeric AS total_bdsp FROM transactions';
    const params = [];
    const wheres = [];
    if (start_date) { params.push(start_date); wheres.push(`created_at >= $${params.length}`); }
    if (end_date) { params.push(end_date); wheres.push(`created_at <= $${params.length}`); }
    if (wheres.length) sql += ' WHERE ' + wheres.join(' AND ');
    sql += ' GROUP BY status ORDER BY status';

    const byStatus = await query(sql, params);

    // Escrow stats
    const escrowSql = 'SELECT status, COUNT(*)::int AS count, COALESCE(SUM(amount), 0)::numeric AS total FROM escrow GROUP BY status';
    const escrowStats = await query(escrowSql);

    res.json({ by_status: byStatus.rows, escrow: escrowStats.rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
