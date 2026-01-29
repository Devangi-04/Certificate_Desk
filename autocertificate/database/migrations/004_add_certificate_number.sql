-- Add certificate number and year columns for CD/YEAR/NO format
-- This will enable the CD/CERTIFICATE_YEAR/CERTIFICATE_NO format

ALTER TABLE certificates 
ADD COLUMN certificate_number INTEGER NULL COMMENT 'Sequential certificate number within the year';

ALTER TABLE certificates 
ADD COLUMN certificate_year INTEGER NULL COMMENT 'Year of certificate issuance';

ALTER TABLE certificates 
ADD COLUMN certificate_full_id VARCHAR(50) NULL COMMENT 'Full certificate ID in CD/YEAR/NO format';

-- Add indexes for certificate number queries
CREATE INDEX IF NOT EXISTS idx_certificates_year_number ON certificates(certificate_year, certificate_number);
CREATE INDEX IF NOT EXISTS idx_certificates_full_id ON certificates(certificate_full_id);

-- Create sequence for certificate numbering
CREATE SEQUENCE IF NOT EXISTS certificate_number_seq START 1;
