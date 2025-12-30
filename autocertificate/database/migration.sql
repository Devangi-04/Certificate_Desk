-- Migration script to add placement columns to templates table
USE autocertificate;

SET @schema_name := DATABASE();

-- Helper to add text_x_ratio if missing
SET @col_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'templates'
    AND COLUMN_NAME = 'text_x_ratio'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE templates ADD COLUMN text_x_ratio DECIMAL(6,4) NULL;',
  'SELECT "text_x_ratio already exists" AS info;'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Helper to add text_y_ratio if missing
SET @col_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'templates'
    AND COLUMN_NAME = 'text_y_ratio'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE templates ADD COLUMN text_y_ratio DECIMAL(6,4) NULL;',
  'SELECT "text_y_ratio already exists" AS info;'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Helper to add text_align if missing
SET @col_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'templates'
    AND COLUMN_NAME = 'text_align'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE templates ADD COLUMN text_align ENUM(''left'',''center'',''right'') DEFAULT ''center'';',
  'SELECT "text_align already exists" AS info;'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Helper to add text_font_size if missing
SET @col_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'templates'
    AND COLUMN_NAME = 'text_font_size'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE templates ADD COLUMN text_font_size INT NULL;',
  'SELECT "text_font_size already exists" AS info;'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Helper to add text_color_hex if missing
SET @col_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'templates'
    AND COLUMN_NAME = 'text_color_hex'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE templates ADD COLUMN text_color_hex CHAR(7) NULL;',
  'SELECT "text_color_hex already exists" AS info;'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Show the updated table structure
DESCRIBE templates;
