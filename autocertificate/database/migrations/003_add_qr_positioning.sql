-- Add QR code positioning columns to templates table
-- This will allow QR codes to be embedded directly into certificate PDFs

ALTER TABLE templates 
ADD COLUMN qr_x_ratio NUMERIC(6,4) NULL COMMENT 'X position ratio for QR code (0-1, from left)';

ALTER TABLE templates 
ADD COLUMN qr_y_ratio NUMERIC(6,4) NULL COMMENT 'Y position ratio for QR code (0-1, from top)';

ALTER TABLE templates 
ADD COLUMN qr_size INTEGER NULL DEFAULT 80 COMMENT 'QR code size in pixels';

-- Add index for QR positioning queries
CREATE INDEX IF NOT EXISTS idx_templates_qr_position ON templates(qr_x_ratio, qr_y_ratio);
