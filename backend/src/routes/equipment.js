import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

const SELECT_COLS = `
  id, name, unit_number, category, description, monthly_rate, status, created_at
`;

// All equipment — any logged-in user can list.
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT ${SELECT_COLS} FROM equipment ORDER BY id DESC`,
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT ${SELECT_COLS} FROM equipment WHERE id = $1`,
      [req.params.id],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: create / update / delete.
router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const { name, unit_number, category, description, monthly_rate, status } = req.body || {};
  // The admin UI no longer has a Name field — synthesize one from
  // category + unit_number so downstream lists still have something to show.
  const effectiveName = (name && String(name).trim())
    || [category, unit_number].filter(Boolean).join(' ').trim()
    || 'Untitled equipment';
  try {
    const { rows } = await query(
      `INSERT INTO equipment (name, unit_number, category, description, monthly_rate, status)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'available'))
       RETURNING ${SELECT_COLS}`,
      [effectiveName, unit_number || null, category || null, description || null, monthly_rate ?? 0, status || null],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { name, unit_number, category, description, monthly_rate, status } = req.body || {};
  try {
    const { rows } = await query(
      `UPDATE equipment SET
         name = COALESCE($1, name),
         unit_number = COALESCE($2, unit_number),
         category = COALESCE($3, category),
         description = COALESCE($4, description),
         monthly_rate = COALESCE($5, monthly_rate),
         status = COALESCE($6, status)
       WHERE id = $7
       RETURNING ${SELECT_COLS}`,
      [name, unit_number, category, description, monthly_rate, status, req.params.id],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const result = await query('DELETE FROM equipment WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
