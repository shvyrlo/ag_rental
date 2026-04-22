import crypto from 'node:crypto';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { signToken, requireAuth } from '../middleware/auth.js';
import { sendVerificationCode } from '../lib/mailer.js';
import { startPhoneVerification, checkPhoneVerification } from '../lib/smsVerify.js';

const router = Router();

// Short-lived 6-digit email codes.
const EMAIL_CODE_TTL_MIN = 15;
const EMAIL_MAX_ATTEMPTS = 5;

function normalizePhone(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, '');
  if (!digits) return null;
  // Bare 10-digit numbers are assumed to be US.
  if (digits.length === 10) return `+1${digits}`;
  return `+${digits}`;
}

function userFromRow(row) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    phone: row.phone || null,
    email_verified: !!row.email_verified,
    phone_verified: !!row.phone_verified,
  };
}

async function issueEmailCode(userId, email) {
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  const codeHash = await bcrypt.hash(code, 10);
  const expires = new Date(Date.now() + EMAIL_CODE_TTL_MIN * 60 * 1000);
  // Any prior pending code for this user is invalidated.
  await query('DELETE FROM email_verification_codes WHERE user_id = $1', [userId]);
  await query(
    `INSERT INTO email_verification_codes (user_id, code_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, codeHash, expires],
  );
  await sendVerificationCode(email, code);
}

// ─── Public registration ──────────────────────────────────────────
// Always creates a client account. Email starts unverified; we try to
// send a verification code immediately but don't fail the registration
// if the mailer is down — the user can always request a resend.
router.post('/register', async (req, res) => {
  const { email, password, name, phone } = req.body || {};
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'email, password, name are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'password must be at least 6 characters' });
  }
  try {
    const existing = await query('SELECT 1 FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rowCount > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    const hash = await bcrypt.hash(password, 10);
    const phoneNormalized = normalizePhone(phone);
    const result = await query(
      `INSERT INTO users (email, password_hash, name, role, phone)
       VALUES ($1, $2, $3, 'client', $4)
       RETURNING id, email, name, role, phone, email_verified, phone_verified`,
      [email.toLowerCase(), hash, name, phoneNormalized],
    );
    const user = userFromRow(result.rows[0]);

    issueEmailCode(user.id, user.email).catch(err => {
      console.error('[auth] failed to issue initial email code', err);
    });

    const token = signToken(user);
    res.status(201).json({ user, token });
  } catch (err) {
    console.error('register error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }
  try {
    const result = await query(
      `SELECT id, email, name, role, password_hash, phone, email_verified, phone_verified
       FROM users WHERE email = $1`,
      [email.toLowerCase()],
    );
    const row = result.rows[0];
    if (!row) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const user = userFromRow(row);
    const token = signToken(user);
    res.json({ user, token });
  } catch (err) {
    console.error('login error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// /me reads from the DB so verification flags are always fresh (the JWT
// itself doesn't carry them — clients call /me after a verify step).
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, email, name, role, phone, email_verified, phone_verified
       FROM users WHERE id = $1`,
      [req.user.id],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json({ user: userFromRow(rows[0]) });
  } catch (err) {
    console.error('me error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Email verification ──────────────────────────────────────────
router.post('/email/send-code', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT id, email, email_verified FROM users WHERE id = $1',
      [req.user.id],
    );
    const row = rows[0];
    if (!row) return res.status(404).json({ error: 'Not found' });
    if (row.email_verified) return res.json({ already_verified: true });
    await issueEmailCode(row.id, row.email);
    res.json({ ok: true });
  } catch (err) {
    console.error('email send-code error', err);
    res.status(500).json({ error: 'Failed to send code' });
  }
});

router.post('/email/verify', requireAuth, async (req, res) => {
  const { code } = req.body || {};
  if (!code || String(code).length < 4) {
    return res.status(400).json({ error: 'code is required' });
  }
  try {
    const { rows } = await query(
      `SELECT id, code_hash, expires_at, attempts
       FROM email_verification_codes
       WHERE user_id = $1
       ORDER BY id DESC LIMIT 1`,
      [req.user.id],
    );
    const rec = rows[0];
    if (!rec) return res.status(400).json({ error: 'No code pending; request a new one.' });
    if (new Date(rec.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Code expired; request a new one.' });
    }
    if (rec.attempts >= EMAIL_MAX_ATTEMPTS) {
      return res.status(429).json({ error: 'Too many attempts; request a new code.' });
    }
    const ok = await bcrypt.compare(String(code), rec.code_hash);
    if (!ok) {
      await query(
        'UPDATE email_verification_codes SET attempts = attempts + 1 WHERE id = $1',
        [rec.id],
      );
      return res.status(400).json({ error: 'Invalid code' });
    }
    await query('UPDATE users SET email_verified = TRUE WHERE id = $1', [req.user.id]);
    await query('DELETE FROM email_verification_codes WHERE user_id = $1', [req.user.id]);
    const { rows: after } = await query(
      `SELECT id, email, name, role, phone, email_verified, phone_verified
       FROM users WHERE id = $1`,
      [req.user.id],
    );
    const user = userFromRow(after[0]);
    const token = signToken(user);
    res.json({ user, token });
  } catch (err) {
    console.error('email verify error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Phone verification (Twilio Verify) ─────────────────────────
router.post('/phone/send-code', requireAuth, async (req, res) => {
  const { phone } = req.body || {};
  const target = normalizePhone(phone);
  if (!target) return res.status(400).json({ error: 'Valid phone number required' });
  try {
    await query(
      'UPDATE users SET phone = $1, phone_verified = FALSE WHERE id = $2',
      [target, req.user.id],
    );
    await startPhoneVerification(target);
    res.json({ ok: true, phone: target });
  } catch (err) {
    console.error('phone send-code error', err);
    res.status(500).json({ error: 'Failed to send SMS' });
  }
});

router.post('/phone/verify', requireAuth, async (req, res) => {
  const { code } = req.body || {};
  if (!code) return res.status(400).json({ error: 'code is required' });
  try {
    const { rows } = await query('SELECT phone FROM users WHERE id = $1', [req.user.id]);
    const phone = rows[0]?.phone;
    if (!phone) return res.status(400).json({ error: 'No phone on file' });
    const result = await checkPhoneVerification(phone, String(code));
    if (!result.ok) return res.status(400).json({ error: 'Invalid or expired code' });
    await query('UPDATE users SET phone_verified = TRUE WHERE id = $1', [req.user.id]);
    const { rows: after } = await query(
      `SELECT id, email, name, role, phone, email_verified, phone_verified
       FROM users WHERE id = $1`,
      [req.user.id],
    );
    const user = userFromRow(after[0]);
    const token = signToken(user);
    res.json({ user, token });
  } catch (err) {
    console.error('phone verify error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
