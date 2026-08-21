const knex = require('knex');
const knexConfig = require('../../knexfile');

const env = process.env.NODE_ENV || 'development';

// STRICT PRODUCTION GUARDRAIL:
// When NODE_ENV=production, MySQL configuration MUST be present and valid.
// NEVER silently fallback to SQLite in production.
if (env === 'production') {
  if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_NAME) {
    console.error('===============================================================');
    console.error('[FATAL DATABASE ERROR] Production environment requires MySQL.');
    console.error('Missing required environment variables: DB_HOST, DB_USER, DB_NAME.');
    console.error('SQLite fallback is strictly forbidden in production mode.');
    console.error('===============================================================');
    process.exit(1);
  }
}

let config = knexConfig[env] || knexConfig.development;
const db = knex(config);

async function verifyDbConnection() {
  try {
    await db.raw('SELECT 1');
    console.log(`[DB] Connected successfully to ${config.client} (${env} mode)`);
  } catch (err) {
    console.error(`[DB ERROR] Failed to connect to database (${config.client}):`, err.message);
    if (env === 'production') {
      console.error('[DB FATAL] Terminating process due to database connection failure in production.');
      process.exit(1);
    }
  }
}

verifyDbConnection();

module.exports = db;
