-- Trackable QR codes for external advertising.
-- A row is created whenever the admin generates a "unique" QR code.
-- The generated QR encodes an API URL like `/r/<slug>`; hitting it bumps
-- scan_count and redirects the visitor to the relevant public page.
--
-- A "general" QR code that just points to the site's home page is generated
-- entirely client-side and does not need a row in this table.

CREATE TABLE IF NOT EXISTS qr_codes (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  label TEXT,
  equipment_id INTEGER REFERENCES equipment(id) ON DELETE CASCADE,
  scan_count INTEGER NOT NULL DEFAULT 0,
  last_scanned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qr_codes_slug ON qr_codes(slug);
CREATE INDEX IF NOT EXISTS idx_qr_codes_equipment ON qr_codes(equipment_id);
