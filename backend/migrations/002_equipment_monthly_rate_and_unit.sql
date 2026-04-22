-- Rename daily_rate -> monthly_rate and add unit_number.
-- Idempotent: safe to run repeatedly. On a fresh DB where 001 created
-- the already-new schema, both statements are no-ops.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'equipment' AND column_name = 'daily_rate'
  ) THEN
    ALTER TABLE equipment RENAME COLUMN daily_rate TO monthly_rate;
  END IF;
END $$;

ALTER TABLE equipment ADD COLUMN IF NOT EXISTS unit_number TEXT;
