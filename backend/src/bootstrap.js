import bcrypt from 'bcryptjs';
import { query } from './db.js';

// Create a single admin account on first boot (if none exists).
// Controlled by ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME env vars.
export async function ensureAdmin() {
  const email = (process.env.ADMIN_EMAIL || 'admin@ag-rental.local').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const name = process.env.ADMIN_NAME || 'Administrator';

  const existing = await query(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`);
  if (existing.rowCount > 0) {
    console.log('[bootstrap] admin already exists — skipping');
    return;
  }

  const hash = await bcrypt.hash(password, 10);
  await query(
    `INSERT INTO users (email, password_hash, name, role)
     VALUES ($1, $2, $3, 'admin')
     ON CONFLICT (email) DO NOTHING`,
    [email, hash, name],
  );
  console.log(`[bootstrap] admin created: ${email}`);
  if (!process.env.ADMIN_PASSWORD) {
    console.log('[bootstrap] default password is "admin123" — change via ADMIN_PASSWORD env var');
  }
}

// Seed a default demo user for the given role. Set the matching EMAIL env
// var to an empty string to skip.
async function ensureDefaultUser({ role, defaults, envPrefix }) {
  const rawEmail = process.env[`${envPrefix}_EMAIL`];
  if (rawEmail === '') {
    console.log(`[bootstrap] default ${role} disabled`);
    return;
  }
  const email = (rawEmail || defaults.email).toLowerCase();
  const password = process.env[`${envPrefix}_PASSWORD`] || defaults.password;
  const name = process.env[`${envPrefix}_NAME`] || defaults.name;

  const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rowCount > 0) {
    console.log(`[bootstrap] default ${role} already exists: ${email}`);
    return;
  }

  const hash = await bcrypt.hash(password, 10);
  await query(
    `INSERT INTO users (email, password_hash, name, role)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO NOTHING`,
    [email, hash, name, role],
  );
  console.log(`[bootstrap] default ${role} created: ${email}`);
  if (!process.env[`${envPrefix}_PASSWORD`]) {
    console.log(`[bootstrap] default ${role} password is "${defaults.password}" — change via ${envPrefix}_PASSWORD env var`);
  }
}

// Create a default demo client account so the app is immediately testable.
export function ensureDefaultClient() {
  return ensureDefaultUser({
    role: 'client',
    envPrefix: 'DEFAULT_CLIENT',
    defaults: {
      email: 'client@ag-rental.local',
      password: 'client123',
      name: 'Demo Client',
    },
  });
}

// Create a default demo mechanic account so the app is immediately testable.
export function ensureDefaultMechanic() {
  return ensureDefaultUser({
    role: 'mechanic',
    envPrefix: 'DEFAULT_MECHANIC',
    defaults: {
      email: 'mechanic@ag-rental.local',
      password: 'mechanic123',
      name: 'Demo Mechanic',
    },
  });
}
