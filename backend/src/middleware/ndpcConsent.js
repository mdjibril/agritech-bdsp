const { badRequest } = require('../httpError');

function requireNpdcConsent(req, _res, next) {
  if (req.body.ndpc_consent !== true) {
    return next(badRequest('NDPC data privacy consent required'));
  }
  next();
}

module.exports = { requireNpdcConsent };
