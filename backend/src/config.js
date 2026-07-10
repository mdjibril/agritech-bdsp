const path = require('node:path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: false });

const isProduction = process.env.NODE_ENV === 'production';

function requireEnv(name, devDefault) {
  const value = process.env[name] || devDefault;
  if (isProduction && !value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  if (!isProduction && !value) {
    console.warn(`WARNING: ${name} not set, using insecure dev default`);
  }
  return value || '';
}

const config = {
  port: Number(process.env.PORT || 4000),
  databaseUrl: requireEnv('DATABASE_URL', 'postgresql://agritech:agritech_dev_password@localhost:5432/agritech_bdsp'),
  databaseSsl: process.env.DATABASE_SSL === 'true' || process.env.PGSSLMODE === 'require' || (isProduction && process.env.DATABASE_URL?.includes('render.com')),
  databaseSslRejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false',
  jwtSecret: requireEnv('JWT_SECRET', 'dev_only_replace_me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  whatsappVerifyToken: requireEnv('WHATSAPP_VERIFY_TOKEN', 'agritech_v4v_verify_token'),
  whatsappAccessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  whatsappApiVersion: process.env.WHATSAPP_API_VERSION || 'v20.0',
};

module.exports = { config };
