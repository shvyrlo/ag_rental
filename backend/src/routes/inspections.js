import { Router } from 'express';
import { query, pool } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

const LIST_SELECT = `
  SELECT
    i.id, i.equipment_id, i.inspector_id, i.rental_id,
    i.notes, i.status, i.kind, i.inspected_at, i.created_at,
    e.name AS equipment_name, e.unit_number AS equipment_unit_number,
    u.name AS inspector_name,
    r.client_id,
    c.name AS client_name,
    (SELECT COUNT(*)::int FROM inspection_photos p WHERE p.inspection_id = i.id) AS photo_count
  FROM inspections i
  JOIN equipment e ON e.id = i.equipment_id
  LEFT JOIN users u ON u.id = i.inspector_id
  LEFT JOIN rentals r ON r.id = i.rental_id
  LEFT JOIN users c ON c.id = r.client_id
`;

// Admin & mechanic see all. Clients see inspections tied to their rentals.
router.get('/', requireAuth, async (req, res) => {
  try {
    let sql = LIST_SELECT + ' ORDER BY i.created_at DESC';
    let params = [];
    if (req.user.role === 'client') {
      sql = LIST_SELECT + `
        WHERE i.rental_id IN (SELECT id FROM rentals WHERE client_id = $1)
        ORDER BY i.created_at DESC
      `;
      params = [req.user.id];
    }
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Return slot + name for each photo on an inspection (no data blob).
router.get('/:id/photos', requireAuth, async (req, res) => {
  try {
    const check = await query(
      `SELECT i.id, r.client_id
         FROM inspections i
         LEFT JOIN rentals r ON r.id = i.rental_id
        WHERE i.id = $1`,
      [req.params.id],
    );
    if (!check.rows[0]) return res.status(404).json({ error: 'Not found' });
    if (req.user.role === 'client' && check.rows[0].client_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { rows } = await query(
      `SELECT slot, name FROM inspection_photos
        WHERE inspection_id = $1 ORDER BY slot`,
      [req.params.id],
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Return the base64 data URI for a single photo slot.
router.get('/:id/photos/:slot', requireAuth, async (req, res) => {
  try {
    const check = await query(
      `SELECT i.id, r.client_id
         FROM inspections i
         LEFT JOIN rentals r ON r.id = i.rental_id
        WHERE i.id = $1`,
      [req.params.id],
    );
    if (!check.rows[0]) return res.status(404).json({ error: 'Not found' });
    if (req.user.role === 'client' && check.rows[0].client_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { rows } = await query(
      `SELECT slot, name, data FROM inspection_photos
        WHERE inspection_id = $1 AND slot = $2`,
      [req.params.id, req.params.slot],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create an inspection. Client must provide a rental they own, a kind
// ('start' or 'end'), and exactly 6 photos.
router.post('/', requireAuth, async (req, res) => {
  const { rental_id, kind, notes, status, photos } = req.body || {};
  let { equipment_id } = req.body || {};

  if (!kind || (kind !== 'start' && kind !== 'end')) {
    return res.status(400).json({ error: "kind must be 'start' or 'end'" });
  }
  if (!rental_id) {
    return res.status(400).json({ error: 'rental_id is required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Look up the rental, verify ownership for clients, and pick up equipment_id.
    const rentalRes = await client.query(
      `SELECT id, client_id, equipment_id FROM rentals WHERE id = $1`,
      [rental_id],
    );
    const rental = rentalRes.rows[0];
    if (!rental) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Rental not found' });
    }
    if (req.user.role === 'client' && rental.client_id !== req.user.id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Not your rental' });
    }
    equipment_id = equipment_id || rental.equipment_id;

    // Clients must upload exactly 6 photos. Admin / mechanic can skip.
    const photoList = Array.isArray(photos) ? photos : [];
    if (req.user.role === 'client' && photoList.length !== 6) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Exactly 6 photos are required' });
    }

    // One inspection of each kind per rental.
    const existing = await client.query(
      `SELECT id FROM inspections WHERE rental_id = $1 AND kind = $2`,
      [rental_id, kind],
    );
    if (existing.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: `A ${kind}-rental inspection already exists for this rental`,
      });
    }

    const ins = await client.query(
      `INSERT INTO inspections
         (equipment_id, rental_id, inspector_id, notes, status, kind)
       VALUES ($1, $2, $3, $4, COALESCE($5, 'pending'), $6)
       RETURNING *`,
      [
        equipment_id,
        rental_id,
        req.user.role === 'client' ? null : req.user.id,
        notes || null,
        status || null,
        kind,
      ],
    );
    const inspection = ins.rows[0];

    for (let i = 0; i < photoList.length; i++) {
      const p = photoList[i];
      if (!p || !p.data) continue;
      await client.query(
        `INSERT INTO inspection_photos (inspection_id, slot, name, data)
         VALUES ($1, $2, $3, $4)`,
        [inspection.id, i + 1, p.name || null, p.data],
      );
    }

    await client.query('COMMIT');
    res.status(201).json(inspection);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// Admin can delete an inspection. Photos cascade via FK ON DELETE CASCADE.
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { rows } = await query(
      `DELETE FROM inspections WHERE id = $1 RETURNING id`,
      [req.params.id],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin / mechanic update an inspection (set status, add notes, record inspected_at).
router.put('/:id', requireAuth, requireRole('admin', 'mechanic'), async (req, res) => {
  const { notes, status, inspected_at } = req.body || {};
  try {
    const { rows } = await query(
      `UPDATE inspections SET
         notes = COALESCE($1, notes),
         status = COALESCE($2, status),
         inspected_at = COALESCE($3::timestamptz, inspected_at),
         inspector_id = COALESCE(inspector_id, $4)
       WHERE id = $5
       RETURNING *`,
      [notes, status, inspected_at, req.user.id, req.params.id],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
