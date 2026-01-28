-- PostgreSQL migration to add pixel-based positioning columns to templates table

ALTER TABLE templates
ADD COLUMN IF NOT EXISTS text_x_pixels DECIMAL(10,2) NULL,
ADD COLUMN IF NOT EXISTS text_y_pixels DECIMAL(10,2) NULL,
ADD COLUMN IF NOT EXISTS canvas_width DECIMAL(10,2) NULL,
ADD COLUMN IF NOT EXISTS canvas_height DECIMAL(10,2) NULL;

-- Show updated table structure
\d templates;
