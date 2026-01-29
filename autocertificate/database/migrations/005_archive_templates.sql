-- Add archive support to templates so certificates remain valid when templates are removed

ALTER TABLE templates
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE templates
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NULL;

-- Ensure existing rows have explicit false value
UPDATE templates SET is_archived = FALSE WHERE is_archived IS NULL;
