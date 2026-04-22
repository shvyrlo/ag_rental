-- Lease / lead-capture application form submissions.
-- File fields store base64 data URIs inline. Fine for documents a few MB in size.

CREATE TABLE IF NOT EXISTS lease_applications (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES users(id) ON DELETE SET NULL,

  full_name TEXT NOT NULL,
  company TEXT,
  dot_number TEXT,
  mc_number TEXT,
  trailer_type TEXT,
  quantity INTEGER,
  phone TEXT,
  email TEXT,

  drivers_license_name TEXT,
  drivers_license_data TEXT,
  articles_name TEXT,
  articles_data TEXT,
  ein_name TEXT,
  ein_data TEXT,

  agreed_to_terms BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lease_apps_client ON lease_applications(client_id);
CREATE INDEX IF NOT EXISTS idx_lease_apps_status ON lease_applications(status);
