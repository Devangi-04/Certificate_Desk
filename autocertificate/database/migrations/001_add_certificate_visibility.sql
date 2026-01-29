-- Add visibility flag and soft delete columns to certificates table
-- This migration separates UI visibility from certificate validity

ALTER TABLE certificates 
ADD COLUMN is_visible BOOLEAN DEFAULT TRUE NOT NULL COMMENT 'Controls UI visibility in dashboards. Hidden certificates remain valid for QR verification.';

ALTER TABLE certificates 
ADD COLUMN deleted_at TIMESTAMP NULL COMMENT 'Soft delete timestamp for certificate revocation. NULL means certificate is not revoked.';

-- Add indexes for better query performance
CREATE INDEX idx_certificates_visible ON certificates(is_visible);
CREATE INDEX idx_certificates_deleted_at ON certificates(deleted_at);

-- Update existing certificates to be visible by default (they already are via DEFAULT TRUE)
-- No need to update existing records as they will inherit the default value
