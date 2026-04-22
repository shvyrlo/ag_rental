-- Two-inspection workflow: every rental gets one "start" and one "end" inspection,
-- each with exactly 6 equipment photos uploaded by the client.

ALTER TABLE inspections
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'start'
    CHECK (kind IN ('start', 'end'));

-- Photos stored as base64 data URIs, same pattern as lease_applications.
-- Created BEFORE the unique index so the cleanup step below can reference it.
CREATE TABLE IF NOT EXISTS inspection_photos (
  id SERIAL PRIMARY KEY,
  inspection_id INTEGER NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  slot INTEGER NOT NULL CHECK (slot BETWEEN 1 AND 6),
  name TEXT,
  data TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (inspection_id, slot)
);

CREATE INDEX IF NOT EXISTS idx_inspection_photos_inspection
  ON inspection_photos(inspection_id);

-- Clean up pre-feature rows so the unique index can be created. An inspection
-- with no photos is useless under the new workflow, and legacy rows all
-- defaulted to kind='start' which collides with itself per-rental.
DELETE FROM inspections
 WHERE id NOT IN (SELECT DISTINCT inspection_id FROM inspection_photos);

-- A rental can have at most one start and one end inspection.
-- Only enforce uniqueness when rental_id is set.
CREATE UNIQUE INDEX IF NOT EXISTS uq_inspections_rental_kind
  ON inspections (rental_id, kind)
  WHERE rental_id IS NOT NULL;
