import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// List view shouldn't echo the full base64 blobs — just report presence.
const LIST_SELECT = `
  SELECT
    c.id, c.equipment_id, c.client_id, c.mechanic_id,
    c.description, c.status, c.resolution_notes, c.repair_type,
    c.resolved_at, c.created_at,
    c.before_photo_name, c.after_photo_name,
    (c.before_photo_data IS NOT NULL) AS has_before_photo,
    (c.after_photo_data  IS NOT NULL) AS has_after_photo,
    e.name AS equipment_name,
    uc.name AS client_name,
    um.name AS mechanic_name
  FROM repair_claims c
  JOIN equipment e ON e.id = c.equipment_id
  LEFT JOIN users uc ON uc.id = c.client_id
  LEFT JOIN users um ON um.id = c.mechanic_id
`;

// Scope by role: admin all, client own, mechanic assigned OR unassigned.
router.get('/', requireAuth, async (req, res) => {
  try {
    let sql = LIST_SELECT + ' ORDER BY c.created_at DESC';
    let params = [];
    if (req.user.role === 'client') {
      sql = LIST_SELECT + ' WHERE c.client_id = $1 ORDER BY c.created_at DESC';
      params = [req.user.id];
    } else if (req.user.role === 'mechanic') {
      sql = LIST_SELECT + ` WHERE c.mechanic_id = $1 OR c.mechanic_id IS NULL
                            ORDER BY c.created_at DESC`;
      params = [req.user.id];
    }
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Fetch the before / after photo for one claim.
router.get('/:id/photo/:kind', requireAuth, async (req, res) => {
  const { kind } = req.params;
  if (kind !== 'before' && kind !== 'after') {
    return res.status(400).json({ error: "kind must be 'before' or 'after'" });
  }
  try {
    const { rows } = await query(
      `SELECT client_id, mechanic_id,
              ${kind}_photo_name AS name,
              ${kind}_photo_data AS data
         FROM repair_claims WHERE id = $1`,
      [req.params.id],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });

    // Clients only see their own claims; mechanics see assigned or unassigned ones.
    if (req.user.role === 'client' && rows[0].client_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (req.user.role === 'mechanic'
        && rows[0].mechanic_id
        && rows[0].mechanic_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (!rows[0].data) return res.status(404).json({ error: 'No photo' });
    res.json({ name: rows[0].name, data: rows[0].data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create — any role. Client provides own id; admin/mechanic may specify.
router.post('/', requireAuth, async (req, res) => {
  const {
    equipment_id, description, mechanic_id, client_id, repair_type,
    before_photo,
  } = req.body || {};
  if (!equipment_id || !description) {
    return res.status(400).json({ error: 'equipment_id and description are required' });
  }
  const kind = repair_type || 'ag';
  if (kind !== 'road' && kind !== 'ag') {
    return res.status(400).json({ error: "repair_type must be 'road' or 'ag'" });
  }
  try {
    const clientForRow = req.user.role === 'client'
      ? req.user.id
      : (client_id ?? null);

    const { rows } = await query(
      `INSERT INTO repair_claims
         (equipment_id, client_id, mechanic_id, description, status, repair_type,
          before_photo_name, before_photo_data)
       VALUES ($1, $2, $3, $4, 'open', $5, $6, $7)
       RETURNING *`,
      [
        equipment_id,
        clientForRow,
        mechanic_id || null,
        description,
        kind,
        before_photo?.name || null,
        before_photo?.data || null,
      ],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Attach / replace the after-repair photo. Clients can do this on their own
// claims (e.g. they fixed it themselves or want to document the resolution);
// admin and the assigned mechanic can do it on any claim they can see.
router.put('/:id/after-photo', requireAuth, async (req, res) => {
  const { after_photo } = req.body || {};
  if (!after_photo?.data) {
    return res.status(400).json({ error: 'after_photo.data is required' });
  }
  try {
    const { rows: existing } = await query(
      'SELECT client_id, mechanic_id FROM repair_claims WHERE id = $1',
      [req.params.id],
    );
    if (!existing[0]) return res.status(404).json({ error: 'Not found' });

    if (req.user.role === 'client' && existing[0].client_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (req.user.role === 'mechanic'
        && existing[0].mechanic_id
        && existing[0].mechanic_id !== req.user.id) {
      return res.status(403).json({ error: 'Claim assigned to another mechanic' });
    }

    const { rows } = await query(
      `UPDATE repair_claims
         SET after_photo_name = $1,
             after_photo_data = $2
       WHERE id = $3
       RETURNING *`,
      [after_photo.name || null, after_photo.data, req.params.id],
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update — admin or mechanic can change status, assign mechanic, add notes,
// and attach the after-repair photo.
router.put('/:id', requireAuth, requireRole('admin', 'mechanic'), async (req, res) => {
  const { status, mechanic_id, resolution_notes, after_photo } = req.body || {};
  try {
    // Mechanics can only touch their own (or unassigned) claims.
    if (req.user.role === 'mechanic') {
      const { rows: existing } = await query(
        'SELECT mechanic_id FROM repair_claims WHERE id = $1',
        [req.params.id],
      );
      if (!existing[0]) return res.status(404).json({ error: 'Not found' });
      if (existing[0].mechanic_id && existing[0].mechanic_id !== req.user.id) {
        return res.status(403).json({ error: 'Claim assigned to another mechanic' });
      }
    }

    const resolvedStatuses = ['resolved', 'rejected'];
    const { rows } = await query(
      `UPDATE repair_claims SET
         status = COALESCE($1, status),
         mechanic_id = COALESCE($2, mechanic_id, $3),
         resolution_notes = COALESCE($4, resolution_notes),
         after_photo_name = COALESCE($5, after_photo_name),
         after_photo_data = COALESCE($6, after_photo_data),
         resolved_at = CASE
           WHEN $1 = ANY($7::text[]) THEN NOW()
           ELSE resolved_at
         END
       WHERE id = $8
       RETURNING *`,
      [
        status,
        mechanic_id,
        req.user.role === 'mechanic' ? req.user.id : null,
        resolution_notes,
        after_photo?.name ?? null,
        after_photo?.data ?? null,
        resolvedStatuses,
        req.params.id,
      ],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
