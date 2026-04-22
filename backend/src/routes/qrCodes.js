import { Router } from 'express';
import crypto from 'node:crypto';
import { query } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// Where to send a scanner after recording the scan. In prod this should be
// set to the public URL of the deployed frontend (e.g. the Vercel URL).
function publicWebUrl(req) {
  return (
    process.env.PUBLIC_WEB_URL ||
    process.env.CORS_ORIGIN?.split(',')[0]?.trim() ||
    `${req.protocol}://${req.get('host')}`
  ).replace(/\/+$/, '');
}

// Build the public-facing URL that the scanner actually lands on after the
// scan is recorded. Phone-number codes redirect straight to a tel: URI so
// the scanner's dialer opens. Equipment-scoped codes go to the home page
// with an ?equipment= query string (the frontend has no detail page yet).
function targetUrlFor(row, webBase) {
  if (row.phone_number) {
    // Strip to the characters tel: actually accepts: digits and a leading +.
    const cleaned = String(row.phone_number).replace(/[^\d+]/g, '');
    return `tel:${cleaned}`;
  }
  if (row.equipment_id) {
    return `${webBase}/?equipment=${row.equipment_id}`;
  }
  return `${webBase}/`;
}

function genSlug() {
  // 8 lowercase-hex characters — short, unambiguous, safe in URLs.
  return crypto.randomBytes(4).toString('hex');
}

// Admin: list tracked QR codes with scan counts.
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT q.id, q.slug, q.label, q.equipment_id, q.phone_number,
              q.scan_count, q.last_scanned_at, q.created_at,
              e.name AS equipment_name, e.unit_number AS equipment_unit_number
         FROM qr_codes q
         LEFT JOIN equipment e ON e.id = q.equipment_id
         ORDER BY q.created_at DESC`,
    );
    const base = `${req.protocol}://${req.get('host')}`;
    const webBase = publicWebUrl(req);
    const enriched = rows.map((r) => ({
      ...r,
      scan_url: `${base}/r/${r.slug}`,
      target_url: targetUrlFor(r, webBase),
    }));
    res.json(enriched);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: create a new tracked QR code.
router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const { label, equipment_id, phone_number } = req.body || {};

  // Equipment + phone are mutually exclusive — a QR has one destination.
  if (equipment_id && phone_number) {
    return res.status(400).json({
      error: 'Choose either equipment or phone number, not both.',
    });
  }
  if (phone_number) {
    const digits = String(phone_number).replace(/[^\d+]/g, '');
    if (digits.replace(/^\+/, '').length < 7) {
      return res.status(400).json({ error: 'phone_number looks invalid' });
    }
  }

  try {
    // Retry on the slim chance of a slug collision.
    let row = null;
    for (let attempt = 0; attempt < 5 && !row; attempt++) {
      const slug = genSlug();
      try {
        const { rows } = await query(
          `INSERT INTO qr_codes (slug, label, equipment_id, phone_number)
           VALUES ($1, $2, $3, $4)
           RETURNING id, slug, label, equipment_id, phone_number,
                     scan_count, last_scanned_at, created_at`,
          [slug, label || null, equipment_id || null, phone_number || null],
        );
        row = rows[0];
      } catch (err) {
        if (err.code !== '23505') throw err; // not a unique-violation
      }
    }
    if (!row) return res.status(500).json({ error: 'Could not allocate slug' });

    const base = `${req.protocol}://${req.get('host')}`;
    const webBase = publicWebUrl(req);
    res.status(201).json({
      ...row,
      scan_url: `${base}/r/${row.slug}`,
      target_url: targetUrlFor(row, webBase),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: delete a QR code.
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { rowCount } = await query('DELETE FROM qr_codes WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Public redirect — this is the URL that the QR code actually encodes.
// Hitting it bumps the scan counter and redirects to the public target.
// Mounted at the root (`/r/:slug`) in server.js, not under `/qr-codes`.
export async function redirectHandler(req, res) {
  const { slug } = req.params;
  try {
    const { rows } = await query(
      `UPDATE qr_codes
          SET scan_count = scan_count + 1,
              last_scanned_at = NOW()
        WHERE slug = $1
        RETURNING equipment_id, phone_number`,
      [slug],
    );
    const webBase = publicWebUrl(req);
    if (!rows[0]) {
      // Unknown slug — just send them home.
      return res.redirect(302, `${webBase}/`);
    }
    return res.redirect(302, targetUrlFor(rows[0], webBase));
  } catch (err) {
    console.error('qr redirect failed', err);
    return res.redirect(302, publicWebUrl(req) + '/');
  }
}

export default router;
