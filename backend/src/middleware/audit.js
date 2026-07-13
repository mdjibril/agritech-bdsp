const { query } = require('../db');

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function auditAuthenticatedWrites(req, res, next) {
  res.on('finish', () => {
    if (!req.user || !WRITE_METHODS.has(req.method) || res.statusCode >= 400) return;
    const action = res.locals.auditAction
      || `${req.method} ${req.originalUrl}`;
    query(
      'INSERT INTO activity_log (actor_id, action) VALUES ($1, $2)',
      [req.user.actor_id, action]
    ).catch(err => console.error('Audit log failure:', err.message));
  });
  next();
}

module.exports = { auditAuthenticatedWrites };
