const { query } = require('./src/config/database');

async function checkTemplateData() {
  try {
    const templates = await query('SELECT id, original_name, text_x_ratio, text_y_ratio, text_font_size, text_align FROM templates ORDER BY id DESC LIMIT 3');
    console.log('Recent template data:');
    templates.forEach(t => {
      console.log(`ID: ${t.id}, Name: ${t.original_name}`);
      console.log(`  X: ${t.text_x_ratio}, Y: ${t.text_y_ratio}, Font: ${t.text_font_size}, Align: ${t.text_align}`);
    });
  } catch (err) {
    console.error('Error:', err);
  }
}

checkTemplateData();
