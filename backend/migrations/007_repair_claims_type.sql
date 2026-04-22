-- Clients pick one of two repair kinds when filing a claim:
--   'road' — stuck on the road, need a roadside fix
--   'ag'   — bring it to the AG Rental shop for repair

ALTER TABLE repair_claims
  ADD COLUMN IF NOT EXISTS repair_type TEXT NOT NULL DEFAULT 'ag'
    CHECK (repair_type IN ('road', 'ag'));
