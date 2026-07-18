const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../../db');
const { requireFields } = require('../../validation');
const { requireAuth, signToken } = require('../../middleware/auth');
const { badRequest } = require('../../httpError');

const router = express.Router();

// Map actor to old frontend user shape
function mapUser(actor) {
  return {
    user_id: actor.actor_id,
    phone: actor.phone,
    full_name: actor.full_name,
    primary_role: actor.actor_type,
    is_bdsp: actor.actor_type === 'BDSP',
    gender: actor.gender ? actor.gender.charAt(0).toUpperCase() + actor.gender.slice(1).toLowerCase() : 'Other',
    lga: actor.lga,
    ward: actor.lga,
    commodities: [],
    ndpc_consent: true,
    onboarded_by: 'Self',
  };
}

// POST /auth/login — Legacy login
router.post('/login', async (req, res, next) => {
  try {
    requireFields(req.body, 'phone', 'password');
    const result = await query(
      'SELECT * FROM actors WHERE phone = $1',
      [req.body.phone]
    );
    if (!result.rows.length) return next(badRequest('Invalid phone or password'));
    const actor = result.rows[0];
    if (!actor.password_hash) return next(badRequest('Invalid phone or password'));
    const match = await bcrypt.compare(req.body.password, actor.password_hash);
    if (!match) return next(badRequest('Invalid phone or password'));
    const token = signToken(actor);
    res.json({ token, user: mapUser(actor) });
  } catch (err) {
    next(err);
  }
});

// GET /auth/me — Legacy profile
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: mapUser(req.user) });
});

module.exports = router;
