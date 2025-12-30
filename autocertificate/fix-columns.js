const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixColumns() {
  try {
    console.log('Connecting to database...');
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    console.log('Checking existing columns...');
    const [columns] = await connection.execute(`SHOW COLUMNS FROM templates`);
    const existingColumns = columns.map(col => col.Field);
    console.log('Existing columns:', existingColumns);

    const requiredColumns = [
      { name: 'text_x_ratio', sql: 'ADD COLUMN text_x_ratio DECIMAL(6,4) NULL' },
      { name: 'text_y_ratio', sql: 'ADD COLUMN text_y_ratio DECIMAL(6,4) NULL' },
      { name: 'text_align', sql: "ADD COLUMN text_align ENUM('left','center','right') DEFAULT 'center'" },
      { name: 'text_font_size', sql: 'ADD COLUMN text_font_size INT NULL' },
      { name: 'text_color_hex', sql: 'ADD COLUMN text_color_hex CHAR(7) NULL' }
    ];

    for (const column of requiredColumns) {
      if (!existingColumns.includes(column.name)) {
        console.log(`Adding column: ${column.name}`);
        try {
          await connection.execute(`ALTER TABLE templates ${column.sql}`);
          console.log(`✓ Added ${column.name}`);
        } catch (error) {
          console.error(`✗ Failed to add ${column.name}:`, error.message);
        }
      } else {
        console.log(`✓ ${column.name} already exists`);
      }
    }

    console.log('\nFinal table structure:');
    const [finalColumns] = await connection.execute(`SHOW COLUMNS FROM templates`);
    finalColumns.forEach(col => console.log(`- ${col.Field}: ${col.Type}`));

    await connection.end();
    console.log('\nColumn fix completed successfully!');
  } catch (error) {
    console.error('Column fix failed:', error);
    process.exit(1);
  }
}

fixColumns();
