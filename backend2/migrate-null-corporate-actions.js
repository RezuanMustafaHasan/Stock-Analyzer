import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

// Load env from backend2/.env regardless of current working directory
const envPath = path.resolve(process.cwd(), 'backend2/.env');
dotenv.config({ path: envPath, override: true });

async function run() {
  const envNoPassword = String(process.env.DB_NO_PASSWORD || '').toLowerCase() === 'true';
  const config = {
    host: process.env.DB_HOST ?? 'localhost',
    user: process.env.DB_USER ?? 'root',
    database: process.env.DB_NAME ?? 'dse_stocks',
    ...(envNoPassword
      ? {}
      : process.env.DB_PASSWORD === undefined
        ? { password: '12345678' }
        : { password: process.env.DB_PASSWORD })
  };

  const conn = await mysql.createConnection({ ...config, multipleStatements: true });
  try {
    console.log('[Migration] Altering corporate_actions to allow NULL dates...');
    await conn.query(`ALTER TABLE corporate_actions\n  MODIFY last_agm_date DATE NULL,\n  MODIFY for_year_ended DATE NULL;`);
    console.log('[Migration] Done.');
  } catch (e) {
    console.error('[Migration] Error:', e.message);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
}

run();