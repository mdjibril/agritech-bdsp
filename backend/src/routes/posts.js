const express = require('express');
const { query } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { badRequest, notFound } = require('../httpError');
const {
  VALID_CATEGORIES,
  VALID_POST_TYPES,
  VALID_UNITS,
  assertOneOf,
  asNonNegativeNumber,
  asPositiveNumber,
  requireFields,
} = require('../validation');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const filters = [];
    const values = [];

    if (req.query.status) {
      values.push(req.query.status);
      filters.push(`p.status = $${values.length}`);
    }
    if (req.query.category) {
      assertOneOf(req.query.category, VALID_CATEGORIES, 'category');
      values.push(req.query.category);
      filters.push(`p.category = $${values.length}`);
    }
    if (req.query.post_type) {
      assertOneOf(req.query.post_type, VALID_POST_TYPES, 'post_type');
      values.push(req.query.post_type);
      filters.push(`p.post_type = $${values.length}`);
    }
    if (req.query.lga) {
      values.push(req.query.lga);
      filters.push(`p.lga = $${values.length}`);
    }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const result = await query(
      `SELECT p.post_id, p.user_id, p.post_type, p.category, p.item_name, p.quantity, p.unit,
              p.price_per_unit, p.lga, p.interested_count, p.status, p.created_at,
              u.full_name AS posted_by, u.primary_role AS poster_role
       FROM posts p
       JOIN users u ON u.user_id = p.user_id
       ${where}
       ORDER BY p.created_at DESC, p.post_id DESC
       LIMIT 100`,
      values,
    );

    res.json({ posts: result.rows });
  } catch (error) {
    next(error);
  }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    requireFields(req.body, ['post_type', 'category', 'item_name', 'quantity', 'unit', 'price_per_unit']);
    assertOneOf(req.body.post_type, VALID_POST_TYPES, 'post_type');
    assertOneOf(req.body.category, VALID_CATEGORIES, 'category');
    assertOneOf(req.body.unit, VALID_UNITS, 'unit');
    if (req.body.lga && req.body.lga !== 'Chikun') {
      throw badRequest('Phase 1 POC listings are restricted to Chikun LGA');
    }

    const result = await query(
      `INSERT INTO posts (
        user_id, post_type, category, item_name, quantity, unit, price_per_unit, lga
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'Chikun')
      RETURNING post_id, user_id, post_type, category, item_name, quantity, unit,
                price_per_unit, lga, interested_count, status`,
      [
        req.user.user_id,
        req.body.post_type,
        req.body.category,
        req.body.item_name,
        asPositiveNumber(req.body.quantity, 'quantity'),
        req.body.unit,
        asNonNegativeNumber(req.body.price_per_unit, 'price_per_unit'),
      ],
    );

    res.locals.auditAction = `Created ${req.body.post_type} post ${result.rows[0].post_id}`;
    res.status(201).json({ post: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

router.patch('/:postId/status', requireAuth, async (req, res, next) => {
  try {
    requireFields(req.body, ['status']);
    assertOneOf(req.body.status, ['Active', 'Hub-Formed', 'Closed'], 'status');

    const result = await query(
      `UPDATE posts
       SET status = $1
       WHERE post_id = $2 AND user_id = $3
       RETURNING post_id, user_id, post_type, category, item_name, quantity, unit,
                 price_per_unit, lga, interested_count, status`,
      [req.body.status, req.params.postId, req.user.user_id],
    );

    if (result.rowCount === 0) {
      throw notFound('Post not found for current user');
    }

    res.locals.auditAction = `Updated post ${req.params.postId} status to ${req.body.status}`;
    res.json({ post: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
