import { Router } from 'express';
import { query, pool } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// Helper: join with equipment + client for display rows.
const LIST_SELECT = `
  SELECT
    r.id, r.client_id, r.equipment_id, r.start_date, r.end_date,
    r.status, r.total_amount, r.created_at,
    e.name AS equipment_name, e.unit_number AS equipment_unit_number,
    e.monthly_rate,
    u.name AS client_name, u.email AS client_email
  FROM rentals r
  JOIN equipment e ON e.id = r.equipment_id
  JOIN users u ON u.id = r.client_id
`;

// Admin sees all. Clients see only their own.
router.get('/', requireAuth, async (req, res) => {
  try {
    let sql = LIST_SELECT + ' ORDER BY r.created_at DESC';
    let params = [];
    if (req.user.role === 'client') {
      sql = LIST_SELECT + ' WHERE r.client_id = $1 ORDER BY r.created_at DESC';
      params = [req.user.id];
    }
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Client creates a rental request.
router.post('/', requireAuth, requireRole('client', 'admin'), async (req, res) => {
  const { equipment_id, start_date, end_date } = req.body || {};
  if (!equipment_id || !start_date || !end_date) {
    return res.status(400).json({ error: 'equipment_id, start_date, end_date required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const eq = await client.query(
      `SELECT id, monthly_rate, status FROM equipment WHERE id = $1 FOR UPDATE`,
      [equipment_id],
    );
    if (!eq.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Equipment not found' });
    }
    if (eq.rows[0].status !== 'available') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: `Equipment is ${eq.rows[0].status}` });
    }

    // Bill per whole month; partial months round up. Minimum one month.
    const days = Math.max(
      1,
      Math.ceil((new Date(end_date) - new Date(start_date)) / (1000 * 60 * 60 * 24)) + 1,
    );
    const months = Math.max(1, Math.ceil(days / 30));
    const total = Number(eq.rows[0].monthly_rate) * months;

    const clientId = req.user.role === 'admin' && req.body.client_id
      ? req.body.client_id
      : req.user.id;

    const result = await client.query(
      `INSERT INTO rentals (client_id, equipment_id, start_date, end_date, total_amount, status)
       VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING *`,
      [clientId, equipment_id, start_date, end_date, total],
    );

    // Also create a pending payment for convenience.
    await client.query(
      `INSERT INTO payments (rental_id, client_id, amount, status)
       VALUES ($1, $2, $3, 'pending')`,
      [result.rows[0].id, clientId, total],
    );

    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// Admin updates rental status.
router.put('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { status } = req.body || {};
  try {
    const { rows } = await query(
      `UPDATE rentals SET status = COALESCE($1, status) WHERE id = $2 RETURNING *`,
      [status, req.params.id],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });

    // Keep equipment status in sync with rental status.
    if (status === 'active') {
      await query(`UPDATE equipment SET status = 'rented' WHERE id = $1`, [rows[0].equipment_id]);
    } else if (status === 'completed' || status === 'cancelled') {
      await query(`UPDATE equipment SET status = 'available' WHERE id = $1`, [rows[0].equipment_id]);
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
