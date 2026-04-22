import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { Pool } = pg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Railway / Heroku-style hosted Postgres typically needs SSL.
// Local docker-compose does not.
const needsSsl = process.env.DATABASE_URL?.includes('railway.app') ||
                 process.env.DATABASE_URL?.includes('render.com') ||
                 process.env.PGSSLMODE === 'require';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: needsSsl ? { rejectUnauthorized: false } : false,
});

export async function query(text, params) {
  return pool.query(text, params);
}

export async function runMigrations() {
  const migrationsDir = path.resolve(__dirname, '..', 'migrations');
  if (!fs.existsSync(migrationsDir)) return;
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    console.log(`[migrate] running ${file}`);
    await pool.query(sql);
  }
  console.log('[migrate] done');
}
