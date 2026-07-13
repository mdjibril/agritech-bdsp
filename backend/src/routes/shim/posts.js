const express = require('express');
const { query } = require('../../db');
const { requireAuth } = require('../../middleware/auth');

const router = express.Router();

const STATUS_MAP = {
  'INITIATED': 'Active',
  'IN_ESCROW': 'Active',
  'DISPATCHED': 'Active',
  'DELIVERED': 'Active',
  'COMPLETED': 'Closed',
  'DISPUTED': 'Active',
};

const CATEGORY_MAP = {
  'Maize': 'Crop', 'Soybean': 'Crop', 'Sorghum': 'Crop', 'Rice': 'Crop', 'Cassava': 'Crop',
  'NPK': 'Input', 'Seed': 'Input', 'Urea': 'Input', 'Herbicide': 'Input',
  'Goats': 'Livestock', 'Poultry': 'Livestock', 'Cattle': 'Livestock', 'Sheep': 'Livestock',
};

const UNIT_MAP = {
  'MT': 'MT', 'Bags': 'Bags', 'Heads': 'Heads',
};

function guessCategory(itemName) {
  return CATEGORY_MAP[itemName] || 'Crop';
}

function guessUnit(itemName) {
  const crops = ['Maize', 'Soybean', 'Sorghum', 'Rice', 'Cassava', 'Millet', 'Wheat'];
  const inputs = ['NPK', 'Seed', 'Urea', 'Herbicide', 'Pesticide', 'Fertilizer'];
  const livestock = ['Goats', 'Poultry', 'Cattle', 'Sheep', 'Pig'];
  if (crops.includes(itemName)) return 'Bags';
  if (inputs.includes(itemName)) return 'Bags';
  if (livestock.includes(itemName)) return 'Heads';
  return 'Bags';
}

// GET /posts — Legacy marketplace listing (from transactions)
router.get('/', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT t.tx_id, t.commodity AS item_name, t.quantity_kg AS quantity,
              t.unit_price AS price_per_unit, t.total_amount, t.status,
              t.buyer_id, t.seller_id, t.created_at,
              seller.full_name AS posted_by,
              seller.actor_type AS poster_role
       FROM transactions t
       JOIN actors seller ON seller.actor_id = t.seller_id
       WHERE t.status IN ('INITIATED', 'IN_ESCROW', 'DISPATCHED', 'DELIVERED')
       ORDER BY t.created_at DESC
       LIMIT 100`
    );

    const posts = result.rows.map(tx => ({
      post_id: `TXN_${String(tx.tx_id).padStart(3, '0')}`,
      user_id: `ACT_${String(tx.seller_id).padStart(3, '0')}`,
      post_type: 'SELL',
      category: guessCategory(tx.item_name),
      item_name: tx.item_name,
      quantity: Number(tx.quantity),
      unit: guessUnit(tx.item_name),
      price_per_unit: Number(tx.price_per_unit),
      lga: 'Chikun',
      interested_count: 0,
      status: STATUS_MAP[tx.status] || 'Active',
      posted_by: tx.posted_by,
      poster_role: tx.poster_role,
      created_at: tx.created_at,
    }));

    res.json({ posts });
  } catch (err) {
    next(err);
  }
});

// POST /posts — Legacy post creation (creates a transaction)
router.post('/', requireAuth, async (req, res, next) => {
  // Shim returns a placeholder — Phase 6 frontend will use v1 API directly
  res.status(501).json({ error: 'Use POST /api/v1/transactions to create marketplace listings' });
});

// PATCH /posts/:postId/status — Legacy status update
router.patch('/:postId/status', requireAuth, (req, res) => {
  res.status(501).json({ error: 'Use PATCH /api/v1/transactions/:id to update transaction status' });
});

module.exports = router;
