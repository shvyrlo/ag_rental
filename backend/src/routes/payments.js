import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

const LIST_SELECT = `
  SELECT
    p.id, p.rental_id, p.client_id, p.amount, p.status, p.method,
    p.paid_at, p.created_at,
    u.name AS client_name, u.email AS client_email,
    e.name AS equipment_name
  FROM payments p
  JOIN users u ON u.id = p.client_id
  LEFT JOIN rentals r ON r.id = p.rental_id
  LEFT JOIN equipment e ON e.id = r.equipment_id
`;

// Admin sees all. Clients see only their own.
router.get('/', requireAuth, async (req, res) => {
  try {
    let sql = LIST_SELECT + ' ORDER BY p.created_at DESC';
    let params = [];
    if (req.user.role === 'client') {
      sql = LIST_SELECT + ' WHERE p.client_id = $1 ORDER BY p.created_at DESC';
      params = [req.user.id];
    } else if (req.user.role === 'mechanic') {
      // Mechanics don't need payments; return empty.
      return res.json([]);
    }
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Client pays a pending payment (mock — just marks it paid).
router.post('/:id/pay', requireAuth, requireRole('client', 'admin'), async (req, res) => {
  const { method } = req.body || {};
  try {
    const existing = await query(
      `SELECT id, client_id, status FROM payments WHERE id = $1`,
      [req.params.id],
    );
    if (!existing.rows[0]) return res.status(404).json({ error: 'Not found' });
    if (req.user.role === 'client' && existing.rows[0].client_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (existing.rows[0].status === 'paid') {
      return res.status(409).json({ error: 'Already paid' });
    }
    const { rows } = await query(
      `UPDATE payments
         SET status = 'paid', method = COALESCE($1, method), paid_at = NOW()
         WHERE id = $2 RETURNING *`,
      [method || 'card', req.params.id],
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin creates an ad-hoc payment record.
router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const { client_id, rental_id, amount, status, method } = req.body || {};
  if (!client_id || !amount) {
    return res.status(400).json({ error: 'client_id and amount are required' });
  }
  try {
    const { rows } = await query(
      `INSERT INTO payments (client_id, rental_id, amount, status, method, paid_at)
       VALUES ($1, $2, $3, COALESCE($4, 'pending'), $5,
               CASE WHEN $4 = 'paid' THEN NOW() ELSE NULL END)
       RETURNING *`,
      [client_id, rental_id || null, amount, status || null, method || null],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin refund.
router.post('/:id/refund', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { rows } = await query(
      `UPDATE payments SET status = 'refunded' WHERE id = $1 RETURNING *`,
      [req.params.id],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
