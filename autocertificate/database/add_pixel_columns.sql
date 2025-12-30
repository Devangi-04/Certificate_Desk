-- Migration script to add pixel-based positioning columns to templates table
USE autocertificate;

SET @schema_name := DATABASE();

-- text_x_pixels
SET @col_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'templates'
    AND COLUMN_NAME = 'text_x_pixels'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE templates ADD COLUMN text_x_pixels DECIMAL(10,2) NULL;',
  'SELECT "text_x_pixels already exists" AS info;'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- text_y_pixels
SET @col_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'templates'
    AND COLUMN_NAME = 'text_y_pixels'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE templates ADD COLUMN text_y_pixels DECIMAL(10,2) NULL;',
  'SELECT "text_y_pixels already exists" AS info;'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- canvas_width
SET @col_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'templates'
    AND COLUMN_NAME = 'canvas_width'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE templates ADD COLUMN canvas_width INT NULL;',
  'SELECT "canvas_width already exists" AS info;'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- canvas_height
SET @col_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'templates'
    AND COLUMN_NAME = 'canvas_height'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE templates ADD COLUMN canvas_height INT NULL;',
  'SELECT "canvas_height already exists" AS info;'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Show the updated table structure
DESCRIBE templates;
