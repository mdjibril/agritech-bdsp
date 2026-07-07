const jwt = require('jsonwebtoken');
const { query } = require('../db');
const { config } = require('../config');
const { forbidden, unauthorized } = require('../httpError');

function extractToken(req) {
  const header = req.get('authorization');
  if (!header) {
    return null;
  }
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }
  return token;
}

async function loadUserFromToken(req) {
  const token = extractToken(req);
  if (!token) {
    return null;
  }

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    throw unauthorized('Invalid or expired token');
  }

  const result = await query(
    `SELECT user_id, phone, full_name, primary_role, secondary_roles, is_bdsp, gender, lga, ward
     FROM users
     WHERE user_id = $1`,
    [payload.sub],
  );

  if (result.rowCount === 0) {
    throw unauthorized('User no longer exists');
  }

  return result.rows[0];
}

async function optionalAuth(req, _res, next) {
  try {
    req.user = await loadUserFromToken(req);
    next();
  } catch (error) {
    next(error);
  }
}

function requireAuth(req, _res, next) {
  if (!req.user) {
    next(unauthorized());
    return;
  }
  next();
}

function requireBdsp(req, _res, next) {
  if (!req.user) {
    next(unauthorized());
    return;
  }
  if (!req.user.is_bdsp) {
    next(forbidden('Certified BDSP access required'));
    return;
  }
  next();
}

module.exports = {
  optionalAuth,
  requireAuth,
  requireBdsp,
};
