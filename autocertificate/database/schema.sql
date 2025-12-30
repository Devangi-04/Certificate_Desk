CREATE DATABASE IF NOT EXISTS autocertificate CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE autocertificate;

CREATE TABLE IF NOT EXISTS templates (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  original_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size INT UNSIGNED NOT NULL,
  stored_path VARCHAR(500) NOT NULL,
  text_x_ratio DECIMAL(6,4) NULL,
  text_y_ratio DECIMAL(6,4) NULL,
  text_align ENUM('left','center','right') DEFAULT 'center',
  text_font_size INT NULL,
  text_color_hex CHAR(7) NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_templates_uploaded_at (uploaded_at)
);

CREATE TABLE IF NOT EXISTS participants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  mes_id VARCHAR(100) NULL,
  extra_data JSON NULL,
  source VARCHAR(50) DEFAULT 'manual',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_participants_email (email)
);

CREATE TABLE IF NOT EXISTS certificates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  participant_id INT NOT NULL,
  template_id INT UNSIGNED NOT NULL,
  pdf_path VARCHAR(500) NULL,
  status ENUM('pending','generated','failed') DEFAULT 'pending',
  delivery_status ENUM('pending','sent','failed') DEFAULT 'pending',
  delivery_message TEXT NULL,
  sent_at TIMESTAMP NULL,
  last_error TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_certificate_pt_tpl (participant_id, template_id),
  CONSTRAINT fk_cert_participant FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE,
  CONSTRAINT fk_cert_template FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
);
