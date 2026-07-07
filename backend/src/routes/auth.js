const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query, transaction } = require('../db');
const { config } = require('../config');
const { badRequest, unauthorized } = require('../httpError');
const {
  VALID_GENDERS,
  VALID_ONBOARDED_BY,
  VALID_ROLES,
  assertOneOf,
  asStringArray,
  requireFields,
} = require('../validation');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function signUserToken(user) {
  return jwt.sign(
    {
      phone: user.phone,
      is_bdsp: user.is_bdsp,
      primary_role: user.primary_role,
    },
    config.jwtSecret,
    {
      subject: user.user_id,
      expiresIn: config.jwtExpiresIn,
    },
  );
}

router.post('/register', async (req, res, next) => {
  try {
    requireFields(req.body, ['full_name', 'phone', 'password', 'primary_role', 'gender', 'ndpc_consent']);
    assertOneOf(req.body.primary_role, VALID_ROLES, 'primary_role');
    assertOneOf(req.body.gender, VALID_GENDERS, 'gender');

    const onboardedBy = req.body.onboarded_by || 'Self';
    assertOneOf(onboardedBy, VALID_ONBOARDED_BY, 'onboarded_by');

    const secondaryRoles = asStringArray(req.body.secondary_roles, 'secondary_roles');
    secondaryRoles.forEach((role) => assertOneOf(role, VALID_ROLES, 'secondary_roles'));

    if (req.body.ndpc_consent !== true) {
      throw badRequest('NDPC consent must be explicitly accepted before registration');
    }
    if (req.body.lga && req.body.lga !== 'Chikun') {
      throw badRequest('Phase 1 POC registration is restricted to Chikun LGA');
    }
    if (String(req.body.password).length < 8) {
      throw badRequest('Password must be at least 8 characters');
    }

    const passwordHash = await bcrypt.hash(req.body.password, 12);
    const user = await transaction(async (client) => {
      const result = await client.query(
        `INSERT INTO users (
          onboarded_by, full_name, phone, password_hash, primary_role, secondary_roles,
          is_bdsp, bdsp_certified_by, gender, lga, ward, gps_lat, gps_lng,
          crops, livestock, inputs_sold, ndpc_consent
        )
        VALUES ($1, $2, $3, $4, $5, $6, false, NULL, $7, 'Chikun', $8, $9, $10, $11, $12, $13, true)
        RETURNING user_id, phone, full_name, primary_role, secondary_roles, is_bdsp, gender, lga, ward`,
        [
          onboardedBy,
          req.body.full_name,
          req.body.phone,
          passwordHash,
          req.body.primary_role,
          secondaryRoles,
          req.body.gender,
          req.body.ward || null,
          req.body.gps_lat || null,
          req.body.gps_lng || null,
          asStringArray(req.body.crops, 'crops'),
          asStringArray(req.body.livestock, 'livestock'),
          asStringArray(req.body.inputs_sold, 'inputs_sold'),
        ],
      );

      await client.query('INSERT INTO activity_log (user_id, action) VALUES ($1, $2)', [
        result.rows[0].user_id,
        'Registered user',
      ]);

      return result.rows[0];
    });

    res.status(201).json({ user, token: signUserToken(user) });
  } catch (error) {
    if (error.code === '23505') {
      next(badRequest('Phone number already exists'));
      return;
    }
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    requireFields(req.body, ['phone', 'password']);

    const result = await query(
      `SELECT user_id, phone, full_name, password_hash, primary_role, secondary_roles, is_bdsp, gender, lga, ward
       FROM users
       WHERE phone = $1`,
      [req.body.phone],
    );

    if (result.rowCount === 0) {
      throw unauthorized('Invalid phone or password');
    }

    const user = result.rows[0];
    const passwordMatches = await bcrypt.compare(req.body.password, user.password_hash);
    if (!passwordMatches) {
      throw unauthorized('Invalid phone or password');
    }

    delete user.password_hash;
    res.json({ user, token: signUserToken(user) });
  } catch (error) {
    next(error);
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
