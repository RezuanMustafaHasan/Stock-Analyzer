import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment before reading process.env, ensure override
dotenv.config({ path: './.env', override: true });

// Build config; allow explicit passwordless mode via DB_NO_PASSWORD
const envNoPassword = String(process.env.DB_NO_PASSWORD || '').toLowerCase() === 'true';
const envPassword = process.env.DB_PASSWORD;
const config = {
  host: process.env.DB_HOST ?? 'localhost',
  user: process.env.DB_USER ?? 'root',
  database: process.env.DB_NAME ?? 'dse_stocks',
  ...(envNoPassword
    ? {}
    : envPassword === undefined
      ? { password: '12345678' }
      : { password: envPassword })
};

export const pool = mysql.createPool({
  ...config,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export async function ensureSchema() {
  const schemaPath = path.join(process.cwd(), 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf-8');
  // Ensure database exists first
  console.log('[DB] ensureSchema using host', config.host, 'user', config.user, 'hasPassword', config.password !== undefined);
  const adminConn = await mysql.createConnection({
    host: config.host,
    user: config.user,
    multipleStatements: true,
    ...(config.password !== undefined ? { password: config.password } : {})
  });
  await adminConn.query(`CREATE DATABASE IF NOT EXISTS \`${config.database}\``);
  await adminConn.end();

  // Apply schema within selected database
  const conn = await mysql.createConnection({
    host: config.host,
    user: config.user,
    database: config.database,
    multipleStatements: true,
    ...(config.password !== undefined ? { password: config.password } : {})
  });
  await conn.query(sql);

  // Migration: ensure 'institute' column exists in shareholding
  try {
    const [cols] = await conn.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME='shareholding' AND COLUMN_NAME='institute'`,
      [config.database]
    );
    if (!cols.length) {
      console.log('[DB] Adding missing column shareholding.institute...');
      await conn.query(`ALTER TABLE shareholding ADD COLUMN institute DECIMAL(9,4) NOT NULL DEFAULT 0 AFTER government`);
      console.log('[DB] Added shareholding.institute.');
    }
  } catch (e) {
    console.warn('[DB] Migration check for shareholding.institute failed:', e.message);
  }

  // Migration: make financial_highlights.loan_as_on nullable to avoid failing upserts
  try {
    const [rows] = await conn.query(
      `SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME='financial_highlights' AND COLUMN_NAME='loan_as_on'`,
      [config.database]
    );
    const isNullable = rows[0]?.IS_NULLABLE;
    if (isNullable === 'NO') {
      console.log('[DB] Altering financial_highlights.loan_as_on to NULL...');
      await conn.query(`ALTER TABLE financial_highlights MODIFY loan_as_on DATE NULL`);
      console.log('[DB] financial_highlights.loan_as_on is now NULL-able.');
    }
  } catch (e) {
    console.warn('[DB] Migration for financial_highlights.loan_as_on failed:', e.message);
  }

  await conn.end();
}