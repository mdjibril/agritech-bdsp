const otps = new Map();

const OTP_VALIDITY_MS = 5 * 60 * 1000;

function generateOtp(phone) {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  otps.set(phone, { code, expiresAt: Date.now() + OTP_VALIDITY_MS });
  return code;
}

function verifyOtp(phone, code) {
  const record = otps.get(phone);
  if (!record) return false;
  if (Date.now() > record.expiresAt) {
    otps.delete(phone);
    return false;
  }
  if (record.code !== String(code)) return false;
  otps.delete(phone);
  return true;
}

module.exports = { generateOtp, verifyOtp };
