const { Pool } = require('pg');
const { config } = require('./config');

const poolOptions = {
  connectionString: config.databaseUrl,
};

if (config.databaseSsl) {
  poolOptions.ssl = {
    rejectUnauthorized: config.databaseSslRejectUnauthorized,
  };
}

const pool = new Pool(poolOptions);

async function query(text, params) {
  return pool.query(text, params);
}

async function transaction(work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  query,
  transaction,
};
