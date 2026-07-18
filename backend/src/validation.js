const VALID_ACTOR_TYPES = ['SHF', 'AGGREGATOR', 'INPUT_VENDOR', 'LOGISTICS', 'BDSP', 'KBS', 'AGRA', 'INVESTOR', 'V4V_ADMIN'];
const VALID_CHANNELS = ['USSD', 'WHATSAPP', 'WEB', 'APP'];
const VALID_KYC_STATUSES = ['PENDING', 'VERIFIED', 'REJECTED'];
const VALID_GENDERS = ['MALE', 'FEMALE', 'OTHER'];
const VALID_TRANSACTION_STATUSES = ['LISTED', 'BUY_REQUEST', 'INITIATED', 'IN_ESCROW', 'DISPATCHED', 'DELIVERED', 'COMPLETED', 'DISPUTED'];
const VALID_ESCROW_STATUSES = ['HELD', 'RELEASED_TO_SELLER', 'REFUNDED_TO_BUYER'];
const VALID_POST_TYPES = ['SELL', 'BUY'];
const VALID_CATEGORIES = ['Crop', 'Livestock', 'Input'];
const VALID_UNITS = ['MT', 'Bags', 'Heads'];

function requireFields(obj, ...fields) {
  for (const field of fields) {
    if (obj[field] === undefined || obj[field] === null || obj[field] === '') {
      throw Object.assign(new Error(`Field "${field}" is required`), { status: 400 });
    }
  }
}

function assertOneOf(value, validValues, fieldName) {
  if (!fieldName) fieldName = 'value';
  if (!validValues.includes(value)) {
    throw Object.assign(
      new Error(`"${fieldName}" must be one of: ${validValues.join(', ')}`),
      { status: 400 }
    );
  }
}

function asStringArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return String(value).split(',').map(s => s.trim()).filter(Boolean);
}

function asPositiveNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    throw Object.assign(new Error('Value must be a positive number'), { status: 400 });
  }
  return n;
}

function asNonNegativeNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw Object.assign(new Error('Value must be a non-negative number'), { status: 400 });
  }
  return n;
}

module.exports = {
  VALID_ACTOR_TYPES,
  VALID_CHANNELS,
  VALID_KYC_STATUSES,
  VALID_GENDERS,
  VALID_TRANSACTION_STATUSES,
  VALID_ESCROW_STATUSES,
  VALID_POST_TYPES,
  VALID_CATEGORIES,
  VALID_UNITS,
  requireFields,
  assertOneOf,
  asStringArray,
  asPositiveNumber,
  asNonNegativeNumber,
};
