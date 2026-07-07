const { query } = require('../db');

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function auditAuthenticatedWrites(req, res, next) {
  res.on('finish', () => {
    if (!req.user || !WRITE_METHODS.has(req.method) || res.statusCode >= 400) {
      return;
    }

    const action = res.locals.auditAction || `${req.method} ${req.route?.path || req.originalUrl}`;
    query('INSERT INTO activity_log (user_id, action) VALUES ($1, $2)', [req.user.user_id, action])
      .catch((error) => {
        console.error('Failed to write activity log', error);
      });
  });

  next();
}

module.exports = { auditAuthenticatedWrites };
