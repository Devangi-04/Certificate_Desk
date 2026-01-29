-- Add QR code support to certificates table
-- This will store the QR code image path and verification URL

ALTER TABLE certificates 
ADD COLUMN qr_code_path VARCHAR(500) NULL COMMENT 'Path to generated QR code image file';

ALTER TABLE certificates 
ADD COLUMN verification_url VARCHAR(1000) NULL COMMENT 'Full URL for certificate verification (used in QR codes)';

ALTER TABLE certificates 
ADD COLUMN is_visible BOOLEAN DEFAULT TRUE NOT NULL COMMENT 'Controls UI visibility in dashboards. Hidden certificates remain valid for QR verification.';

ALTER TABLE certificates 
ADD COLUMN deleted_at TIMESTAMPTZ NULL COMMENT 'Soft delete timestamp for certificate revocation. NULL means certificate is not revoked.';

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_certificates_visible ON certificates(is_visible);
CREATE INDEX IF NOT EXISTS idx_certificates_deleted_at ON certificates(deleted_at);
CREATE INDEX IF NOT EXISTS idx_certificates_qr_path ON certificates(qr_code_path);
