const jwt = require('jsonwebtoken');
const { config } = require('../config');
const { query } = require('../db');
const { unauthorized, forbidden } = require('../httpError');

function extractToken(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice(7);
}

async function loadUserFromToken(req) {
  const token = extractToken(req);
  if (!token) return null;
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const result = await query(
      `SELECT actor_id, phone, full_name, actor_type, channel,
              bank_name, account_number, kyc_status, gender, bdsp_id,
              wallet_balance, lga, state, created_at
       FROM actors WHERE actor_id = $1`,
      [payload.sub]
    );
    if (!result.rows.length) return null;
    return result.rows[0];
  } catch {
    return null;
  }
}

async function optionalAuth(req, _res, next) {
  req.user = await loadUserFromToken(req);
  next();
}

async function requireAuth(req, _res, next) {
  req.user = await loadUserFromToken(req);
  if (!req.user) return next(unauthorized('Authentication required'));
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.actor_type)) {
      return next(forbidden(`Required role: ${roles.join(' or ')}`));
    }
    next();
  };
}

function signToken(actor) {
  return jwt.sign(
    { sub: actor.actor_id, phone: actor.phone, actor_type: actor.actor_type },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn || '7d' }
  );
}

module.exports = { optionalAuth, requireAuth, requireRole, signToken, extractToken };
