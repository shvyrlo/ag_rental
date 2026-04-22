import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

const LIST_SELECT = `
  SELECT
    a.id, a.client_id, a.full_name, a.company, a.dot_number, a.mc_number,
    a.trailer_type, a.quantity, a.phone, a.email,
    a.drivers_license_name, a.articles_name, a.ein_name,
    (a.drivers_license_data IS NOT NULL) AS has_drivers_license,
    (a.articles_data IS NOT NULL)        AS has_articles,
    (a.ein_data IS NOT NULL)             AS has_ein,
    a.agreed_to_terms, a.status, a.admin_notes, a.created_at,
    u.name  AS client_name,
    u.email AS client_email
  FROM lease_applications a
  LEFT JOIN users u ON u.id = a.client_id
`;

// List — admin sees all, client sees own.
router.get('/', requireAuth, async (req, res) => {
  try {
    let sql = LIST_SELECT + ' ORDER BY a.created_at DESC';
    let params = [];
    if (req.user.role === 'client') {
      sql = LIST_SELECT + ' WHERE a.client_id = $1 ORDER BY a.created_at DESC';
      params = [req.user.id];
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create — client submits their own application.
router.post('/', requireAuth, requireRole('client'), async (req, res) => {
  const {
    full_name, company, dot_number, mc_number, trailer_type, quantity,
    phone, email,
    drivers_license_name, drivers_license_data,
    articles_name,        articles_data,
    ein_name,             ein_data,
    agreed_to_terms,
  } = req.body || {};

  if (!full_name) return res.status(400).json({ error: 'full_name is required' });
  if (!agreed_to_terms) return res.status(400).json({ error: 'You must agree to the terms.' });

  try {
    const qty = quantity === '' || quantity === null || quantity === undefined
      ? null
      : Number(quantity);

    const { rows } = await query(
      `INSERT INTO lease_applications (
         client_id, full_name, company, dot_number, mc_number, trailer_type,
         quantity, phone, email,
         drivers_license_name, drivers_license_data,
         articles_name, articles_data,
         ein_name, ein_data,
         agreed_to_terms
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16
       ) RETURNING id, status, created_at`,
      [
        req.user.id,
        full_name, company || null, dot_number || null, mc_number || null,
        trailer_type || null, qty, phone || null, email || null,
        drivers_license_name || null, drivers_license_data || null,
        articles_name || null,        articles_data || null,
        ein_name || null,             ein_data || null,
        Boolean(agreed_to_terms),
      ],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: update status / notes.
router.put('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { status, admin_notes } = req.body || {};
  if (status && !['pending', 'approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'invalid status' });
  }
  try {
    const { rows } = await query(
      `UPDATE lease_applications SET
         status      = COALESCE($1, status),
         admin_notes = COALESCE($2, admin_notes)
       WHERE id = $3
       RETURNING id, status, admin_notes`,
      [status || null, admin_notes ?? null, req.params.id],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: fetch a single file (base64 data URI + original name).
// kind = drivers_license | articles | ein
router.get('/:id/files/:kind', requireAuth, requireRole('admin'), async (req, res) => {
  const map = {
    drivers_license: { data: 'drivers_license_data', name: 'drivers_license_name' },
    articles:        { data: 'articles_data',        name: 'articles_name' },
    ein:             { data: 'ein_data',             name: 'ein_name' },
  };
  const cols = map[req.params.kind];
  if (!cols) return res.status(400).json({ error: 'invalid kind' });
  try {
    const { rows } = await query(
      `SELECT ${cols.data} AS data, ${cols.name} AS name
         FROM lease_applications WHERE id = $1`,
      [req.params.id],
    );
    if (!rows[0] || !rows[0].data) {
      return res.status(404).json({ error: 'File not found' });
    }
    res.json({ name: rows[0].name || req.params.kind, data: rows[0].data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
