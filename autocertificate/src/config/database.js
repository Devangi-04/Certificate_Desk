const { Pool } = require('pg');

function normalizeDatabaseUrl(url) {
  if (typeof url !== 'string') {
    return '';
  }

  return url.trim();
}

function redactUrl(urlInstance) {
  if (!urlInstance) return '';

  const clone = new URL(urlInstance.toString());
  if (clone.username) {
    clone.username = '***';
  }
  if (clone.password) {
    clone.password = '***';
  }
  return clone.toString();
}

const rawDatabaseUrl = normalizeDatabaseUrl(process.env.DATABASE_URL);

if (!rawDatabaseUrl) {
  throw new Error(
    'DATABASE_URL environment variable is missing. Please set it to your Postgres connection string (e.g. postgres://user:password@host:5432/database?sslmode=require).'
  );
}

let parsedUrl;
try {
  parsedUrl = new URL(rawDatabaseUrl);
} catch (parseError) {
  throw new Error(
    'DATABASE_URL environment variable is not a valid URL. Ensure it matches postgres://user:password@host:port/database?sslmode=require'
  );
}

const hostname = parsedUrl.hostname;
if (!hostname || hostname === 'base') {
  throw new Error(
    `DATABASE_URL environment variable appears to have an invalid hostname ("${hostname || 'undefined'}"). Check that the value matches the expected Postgres connection string.`
  );
}

const isLocalhost = ['localhost', '127.0.0.1'].includes(hostname);
const poolConfig = {
  connectionString: rawDatabaseUrl,
};

if (!isLocalhost) {
  poolConfig.ssl = { rejectUnauthorized: false };
}

console.info(
  '[database] Using connection:',
  redactUrl(parsedUrl)
);

const pool = new Pool(poolConfig);

async function query(text, params = []) {
  const { rows } = await pool.query(text, params);
  return rows;
}

async function getConnection() {
  return pool.connect();
}

module.exports = {
  pool,
  query,
  getConnection,
};
