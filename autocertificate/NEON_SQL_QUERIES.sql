-- ============================================
-- NEON SQL QUERIES FOR CERTIFICATE DESK SYSTEM
-- ============================================
-- Run these queries in order in your Neon SQL editor
-- ============================================

-- 1. ADD CERTIFICATE VISIBILITY COLUMNS
-- ============================================
ALTER TABLE certificates 
ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT TRUE NOT NULL;

ALTER TABLE certificates 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

-- Add indexes for visibility system
CREATE INDEX IF NOT EXISTS idx_certificates_visible ON certificates(is_visible);
CREATE INDEX IF NOT EXISTS idx_certificates_deleted_at ON certificates(deleted_at);

-- 2. ADD QR CODE SUPPORT COLUMNS
-- ============================================
ALTER TABLE certificates 
ADD COLUMN IF NOT EXISTS qr_code_path VARCHAR(500) NULL;

ALTER TABLE certificates 
ADD COLUMN IF NOT EXISTS verification_url VARCHAR(1000) NULL;

-- Add index for QR code queries
CREATE INDEX IF NOT EXISTS idx_certificates_qr_path ON certificates(qr_code_path);

-- 3. ADD QR CODE POSITIONING TO TEMPLATES
-- ============================================
ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS qr_x_ratio NUMERIC(6,4) NULL;

ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS qr_y_ratio NUMERIC(6,4) NULL;

ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS qr_size INTEGER NULL DEFAULT 80;

-- Add index for QR positioning queries
CREATE INDEX IF NOT EXISTS idx_templates_qr_position ON templates(qr_x_ratio, qr_y_ratio);

-- 4. ADD CERTIFICATE ID FORMAT COLUMNS
-- ============================================
ALTER TABLE certificates 
ADD COLUMN IF NOT EXISTS certificate_number INTEGER NULL;

ALTER TABLE certificates 
ADD COLUMN IF NOT EXISTS certificate_year INTEGER NULL;

ALTER TABLE certificates 
ADD COLUMN IF NOT EXISTS certificate_full_id VARCHAR(50) NULL;

-- Add indexes for certificate number queries
CREATE INDEX IF NOT EXISTS idx_certificates_year_number ON certificates(certificate_year, certificate_number);
CREATE INDEX IF NOT EXISTS idx_certificates_full_id ON certificates(certificate_full_id);

-- 5. BACKFILL EXISTING CERTIFICATES WITH NEW ID FORMAT
-- ============================================
-- This will update existing certificates with the new CD/YEAR/NO format
UPDATE certificates 
SET 
    certificate_year = EXTRACT(YEAR FROM created_at),
    certificate_full_id = 'CD/' || EXTRACT(YEAR FROM created_at) || '/' || LPAD(id::text, 6, '0')
WHERE certificate_full_id IS NULL;

-- Set sequential numbers for existing certificates
WITH numbered_certs AS (
    SELECT 
        id,
        certificate_year,
        ROW_NUMBER() OVER (PARTITION BY EXTRACT(YEAR FROM created_at) ORDER BY created_at, id) as seq_num
    FROM certificates 
    WHERE certificate_number IS NULL
)
UPDATE certificates c
SET certificate_number = nc.seq_num
FROM numbered_certs nc
WHERE c.id = nc.id;

-- 6. UPDATE PARTICIPANTS TABLE FOR SOFT DELETE (if not already exists)
-- ============================================
ALTER TABLE participants 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

-- Add index for participants soft delete
CREATE INDEX IF NOT EXISTS idx_participants_deleted ON participants(deleted_at);

-- 7. CREATE CERTIFICATE DELIVERY LOGS TABLE (if not exists)
-- ============================================
CREATE TABLE IF NOT EXISTS certificate_delivery_logs (
    id BIGSERIAL PRIMARY KEY,
    certificate_id BIGINT NOT NULL REFERENCES certificates(id) ON DELETE CASCADE,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT CHECK (status IN ('sent','failed')) NOT NULL,
    message TEXT NULL
);

-- Add index for delivery logs
CREATE INDEX IF NOT EXISTS idx_certificate_logs_cert_id ON certificate_delivery_logs(certificate_id, sent_at DESC);

-- 8. ENSURE UNIQUE EMAIL CONSTRAINT FOR ACTIVE PARTICIPANTS
-- ============================================
DROP INDEX IF EXISTS uniq_participants_email_active;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_participants_email_active ON participants(email) WHERE deleted_at IS NULL;

-- 9. VERIFY TABLE STRUCTURES
-- ============================================
-- Check certificates table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'certificates' 
ORDER BY ordinal_position;

-- Check templates table structure  
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'templates' 
ORDER BY ordinal_position;

-- Check participants table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'participants' 
ORDER BY ordinal_position;

-- 10. SAMPLE DATA VERIFICATION
-- ============================================
-- Check if certificates have the new columns populated
SELECT 
    id,
    certificate_full_id,
    certificate_year,
    certificate_number,
    is_visible,
    deleted_at,
    qr_code_path,
    verification_url,
    created_at
FROM certificates 
ORDER BY created_at DESC 
LIMIT 5;

-- Check templates for QR positioning columns
SELECT 
    id,
    original_name,
    qr_x_ratio,
    qr_y_ratio,
    qr_size
FROM templates 
ORDER BY uploaded_at DESC;

-- ============================================
-- COMPLETION CHECKLIST
-- ============================================
-- After running these queries, verify:

-- ✅ Certificates table has: is_visible, deleted_at, qr_code_path, verification_url, certificate_number, certificate_year, certificate_full_id
-- ✅ Templates table has: qr_x_ratio, qr_y_ratio, qr_size  
-- ✅ Participants table has: deleted_at
-- ✅ All indexes are created
-- ✅ Existing certificates have certificate_full_id populated
-- ✅ Certificate numbers are sequential within each year

-- ============================================
-- TROUBLESHOOTING
-- ============================================

-- If you get "column already exists" errors, the IF NOT EXISTS clauses should handle them
-- If you need to reset certificate numbering for a specific year:
-- UPDATE certificates SET certificate_number = NULL WHERE certificate_year = 2024;
-- Then re-run the backfill query for that year

-- If you need to check for any data issues:
-- SELECT COUNT(*) as total_certificates FROM certificates;
-- SELECT COUNT(*) as certificates_with_full_id FROM certificates WHERE certificate_full_id IS NOT NULL;
-- SELECT certificate_year, COUNT(*) as count FROM certificates GROUP BY certificate_year ORDER BY certificate_year;
