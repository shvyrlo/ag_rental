-- Each repair claim can carry two photos, both stored as base64 data URIs:
--   before_photo — client snaps this when filing the claim (shows the problem)
--   after_photo  — mechanic/admin attaches this on resolution (shows the fix)

ALTER TABLE repair_claims
  ADD COLUMN IF NOT EXISTS before_photo_name TEXT,
  ADD COLUMN IF NOT EXISTS before_photo_data TEXT,
  ADD COLUMN IF NOT EXISTS after_photo_name  TEXT,
  ADD COLUMN IF NOT EXISTS after_photo_data  TEXT;
