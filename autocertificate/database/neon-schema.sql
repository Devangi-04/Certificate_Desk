-- PostgreSQL Schema for Neon Database
-- Certificate_Desk - Neon Compatible Version

CREATE TABLE IF NOT EXISTS templates (
  id BIGSERIAL PRIMARY KEY,
  original_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size BIGINT NOT NULL,
  stored_path VARCHAR(500) NOT NULL,
  text_x_ratio NUMERIC(6,4) NULL,
  text_y_ratio NUMERIC(6,4) NULL,
  text_align TEXT CHECK (text_align IN ('left','center','right')) DEFAULT 'center',
  text_font_size INTEGER NULL,
  text_color_hex CHAR(7) NULL,
  text_x_pixels INTEGER NULL,
  text_y_pixels INTEGER NULL,
  canvas_width INTEGER NULL,
  canvas_height INTEGER NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS participants (
  id BIGSERIAL PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  mes_id VARCHAR(100) NULL,
  extra_data JSONB NULL,
  source VARCHAR(50) DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS certificates (
  id BIGSERIAL PRIMARY KEY,
  participant_id BIGINT NOT NULL,
  template_id BIGINT NOT NULL,
  pdf_path VARCHAR(500) NULL,
  status TEXT CHECK (status IN ('pending','generated','failed')) DEFAULT 'pending',
  delivery_status TEXT CHECK (delivery_status IN ('pending','sent','failed')) DEFAULT 'pending',
  delivery_message TEXT NULL,
  sent_at TIMESTAMPTZ NULL,
  last_error TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (participant_id, template_id),
  CONSTRAINT fk_cert_participant FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE SET NULL,
  CONSTRAINT fk_cert_template FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS certificate_delivery_logs (
  id BIGSERIAL PRIMARY KEY,
  certificate_id BIGINT NOT NULL REFERENCES certificates(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT CHECK (status IN ('sent','failed')) NOT NULL,
  message TEXT NULL
);

CREATE SEQUENCE IF NOT EXISTS certificate_number_seq START 100000;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_templates_uploaded_at ON templates(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_participants_deleted ON participants(deleted_at);
CREATE INDEX IF NOT EXISTS idx_certificates_participant ON certificates(participant_id);
CREATE INDEX IF NOT EXISTS idx_certificates_template ON certificates(template_id);
CREATE INDEX IF NOT EXISTS idx_certificate_logs_cert_id ON certificate_delivery_logs(certificate_id, sent_at DESC);

-- Enforce unique email only for active participants
DROP INDEX IF EXISTS participants_email_key;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_participants_email_active ON participants(email) WHERE deleted_at IS NULL;
