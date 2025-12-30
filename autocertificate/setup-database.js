const mysql = require('mysql2/promise');
require('dotenv').config();

async function setupDatabase() {
  try {
    console.log('Connecting to database...');
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

    console.log('Creating database if not exists...');
    await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await connection.query(`USE \`${process.env.DB_NAME}\``);

    console.log('Creating templates table...');
    await connection.execute(`
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
      )
    `);

    console.log('Adding placement columns if they don\'t exist...');
    try {
      await connection.execute(`ALTER TABLE templates ADD COLUMN IF NOT EXISTS text_x_ratio DECIMAL(6,4) NULL`);
      await connection.execute(`ALTER TABLE templates ADD COLUMN IF NOT EXISTS text_y_ratio DECIMAL(6,4) NULL`);
      await connection.execute(`ALTER TABLE templates ADD COLUMN IF NOT EXISTS text_align ENUM('left','center','right') DEFAULT 'center'`);
      await connection.execute(`ALTER TABLE templates ADD COLUMN IF NOT EXISTS text_font_size INT NULL`);
      await connection.execute(`ALTER TABLE templates ADD COLUMN IF NOT EXISTS text_color_hex CHAR(7) NULL`);
    } catch (error) {
      console.log('Columns may already exist:', error.message);
    }

    console.log('Creating participants table...');
    await connection.execute(`
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
      )
    `);

    console.log('Creating certificates table...');
    await connection.execute(`
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
      )
    `);

    console.log('Checking templates table structure...');
    const [columns] = await connection.execute(`DESCRIBE templates`);
    console.log('Templates table columns:');
    columns.forEach(col => console.log(`- ${col.Field}: ${col.Type}`));

    await connection.end();
    console.log('Database setup completed successfully!');
  } catch (error) {
    console.error('Database setup failed:', error);
    process.exit(1);
  }
}

setupDatabase();
