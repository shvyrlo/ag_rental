import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// Admin-only: list users, optionally filtered by role.
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  const { role } = req.query;
  try {
    let sql = `SELECT id, email, name, role, created_at FROM users`;
    const params = [];
    if (role) {
      sql += ` WHERE role = $1`;
      params.push(role);
    }
    sql += ` ORDER BY created_at DESC`;
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin-only: create a user (mechanic or client — not another admin).
router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const { email, password, name, role } = req.body || {};
  if (!email || !password || !name || !role) {
    return res.status(400).json({ error: 'email, password, name, role are required' });
  }
  if (!['client', 'mechanic'].includes(role)) {
    return res.status(400).json({ error: 'role must be client or mechanic' });
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
    const { rows } = await query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, name, role, created_at`,
      [email.toLowerCase(), hash, name, role],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin-only: update a user (name, email, password). Role cannot be changed.
router.put('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { name, email, password } = req.body || {};
  try {
    const existing = await query('SELECT id, role FROM users WHERE id = $1', [req.params.id]);
    if (!existing.rows[0]) return res.status(404).json({ error: 'Not found' });
    if (existing.rows[0].role === 'admin') {
      return res.status(403).json({ error: 'Admin account cannot be modified here' });
    }

    const hash = password ? await bcrypt.hash(password, 10) : null;
    const { rows } = await query(
      `UPDATE users SET
         name = COALESCE($1, name),
         email = COALESCE($2, email),
         password_hash = COALESCE($3, password_hash)
       WHERE id = $4
       RETURNING id, email, name, role, created_at`,
      [name || null, email ? email.toLowerCase() : null, hash, req.params.id],
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin-only: delete a user. Cannot delete an admin or yourself.
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    if (Number(req.params.id) === Number(req.user.id)) {
      return res.status(400).json({ error: "You can't delete your own account" });
    }
    const existing = await query('SELECT id, role FROM users WHERE id = $1', [req.params.id]);
    if (!existing.rows[0]) return res.status(404).json({ error: 'Not found' });
    if (existing.rows[0].role === 'admin') {
      return res.status(403).json({ error: 'Admin account cannot be deleted' });
    }
    await query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
