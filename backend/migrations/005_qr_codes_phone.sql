-- Allow a QR code's scan target to be a phone number (tel: link).
-- Stored verbatim so the admin sees their own formatting; stripped to
-- digits/+ at redirect time.
ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS phone_number TEXT;
