const { badRequest } = require('./httpError');

const VALID_ROLES = ['SHF', 'Buyer', 'Input Dealer', 'Logistics'];
const VALID_ONBOARDED_BY = ['KBS_Student', 'BDSP_01', 'Self'];
const VALID_GENDERS = ['Male', 'Female'];
const VALID_POST_TYPES = ['SELL', 'BUY'];
const VALID_CATEGORIES = ['Crop', 'Livestock', 'Input'];
const VALID_UNITS = ['MT', 'Bags', 'Heads'];

function requireFields(body, fields) {
  const missing = fields.filter((field) => body[field] === undefined || body[field] === null || body[field] === '');
  if (missing.length) {
    throw badRequest('Missing required fields', { missing });
  }
}

function assertOneOf(value, validValues, field) {
  if (!validValues.includes(value)) {
    throw badRequest(`Invalid ${field}`, { field, validValues });
  }
}

function asStringArray(value, field) {
  if (value === undefined || value === null) {
    return [];
  }
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw badRequest(`${field} must be an array of strings`);
  }
  return value;
}

function asPositiveNumber(value, field) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    throw badRequest(`${field} must be a positive number`);
  }
  return numberValue;
}

function asNonNegativeNumber(value, field) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue < 0) {
    throw badRequest(`${field} must be a non-negative number`);
  }
  return numberValue;
}

module.exports = {
  VALID_ROLES,
  VALID_ONBOARDED_BY,
  VALID_GENDERS,
  VALID_POST_TYPES,
  VALID_CATEGORIES,
  VALID_UNITS,
  requireFields,
  assertOneOf,
  asStringArray,
  asPositiveNumber,
  asNonNegativeNumber,
};
