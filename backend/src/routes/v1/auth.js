const express = require('express');
const bcrypt = require('bcryptjs');
const { query, transaction } = require('../../db');
const { requireFields, assertOneOf, VALID_ACTOR_TYPES, VALID_GENDERS } = require('../../validation');
const { requireAuth, signToken } = require('../../middleware/auth');
const { requireNpdcConsent } = require('../../middleware/ndpcConsent');
const { generateOtp, verifyOtp } = require('../../services/otpStore');
const { badRequest } = require('../../httpError');

const router = express.Router();

const TEMP_TOKEN_EXPIRY = '10m';

// POST /api/v1/auth/send-otp
router.post('/send-otp', (req, res) => {
  requireFields(req.body, 'phone');
  const code = generateOtp(req.body.phone);
  console.log(`[MOCK OTP] ${req.body.phone} -> ${code}`);
  res.json({ success: true, message: 'OTP sent (check server logs)' });
});

// POST /api/v1/auth/verify-otp
router.post('/verify-otp', (req, res) => {
  requireFields(req.body, 'phone', 'code');
  if (!verifyOtp(req.body.phone, req.body.code)) {
    return res.status(400).json({ error: 'Invalid or expired OTP' });
  }
  const tempToken = signToken({ actor_id: `temp_${req.body.phone}`, phone: req.body.phone, actor_type: 'PENDING' });
  res.json({ tempToken, message: 'OTP verified. Use tempToken in /register.' });
});

// POST /api/v1/auth/register
router.post('/register', requireNpdcConsent, async (req, res, next) => {
  try {
    requireFields(req.body, 'phone', 'password', 'full_name', 'actor_type', 'bank_name', 'account_number', 'gender');
    assertOneOf(req.body.actor_type, VALID_ACTOR_TYPES, 'actor_type');
    assertOneOf(req.body.gender, VALID_GENDERS, 'gender');

    const password_hash = await bcrypt.hash(req.body.password, 12);

    const result = await query(
      `INSERT INTO actors (phone, password_hash, full_name, actor_type, channel, bank_name, account_number, gender, lga, state, kyc_status, bdsp_id)
       VALUES ($1, $2, $3, $4, COALESCE($5, 'WEB'), $6, $7, $8, COALESCE($9, 'Chikun'), COALESCE($10, 'Kaduna'), 'PENDING',
         CASE WHEN $4 = 'SHF' THEN 1 ELSE NULL END)
       RETURNING actor_id, phone, full_name, actor_type, channel, bank_name, account_number, kyc_status, gender, bdsp_id, wallet_balance, lga, state, created_at`,
      [req.body.phone, password_hash, req.body.full_name, req.body.actor_type,
       req.body.channel, req.body.bank_name, req.body.account_number,
       req.body.gender, req.body.lga, req.body.state]
    );

    const actor = result.rows[0];
    const token = signToken(actor);

    res.status(201).json({ token, user: actor });
  } catch (err) {
    if (err.code === '23505' && err.constraint === 'actors_phone_key') {
      return next(badRequest('Phone number already registered'));
    }
    next(err);
  }
});

// POST /api/v1/auth/login
router.post('/login', async (req, res, next) => {
  try {
    requireFields(req.body, 'phone', 'password');
    const result = await query(
      'SELECT actor_id, phone, password_hash, full_name, actor_type, channel, bank_name, account_number, kyc_status, gender, bdsp_id, wallet_balance, lga, state, created_at FROM actors WHERE phone = $1',
      [req.body.phone]
    );
    if (!result.rows.length) return next(badRequest('Invalid phone or password'));
    const actor = result.rows[0];
    if (!actor.password_hash) return next(badRequest('This account uses OTP login. Please use send-otp.'));
    const match = await bcrypt.compare(req.body.password, actor.password_hash);
    if (!match) return next(badRequest('Invalid phone or password'));
    delete actor.password_hash;
    const token = signToken(actor);
    res.json({ token, user: actor });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
