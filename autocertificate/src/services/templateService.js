const path = require('path');
const {
  saveBufferToStorage,
  deleteFromStorage,
} = require('../utils/fileStorage');
const { query } = require('../config/database');

function formatTemplate(template) {
  if (!template) return template;
  const storedPath = template.stored_path;
  const filePath = storedPath
    ? storedPath.startsWith('http://') || storedPath.startsWith('https://')
      ? storedPath
      : storedPath.replace(/\\/g, '/').replace(/^\/+/, '')
    : null;
  return {
    ...template,
    file_path: filePath,
    text_color_hex: template.text_color_hex,
  };
}

async function saveTemplateFile(file) {
  if (!file) {
    throw new Error('Template file is required');
  }
  const extension = path.extname(file.originalname) || '.pdf';
  const stored = await saveBufferToStorage(file.buffer, 'templates', extension.toLowerCase(), '', {
    contentType: file.mimetype,
  });
  const [template] = await query(
    `INSERT INTO templates (original_name, stored_name, mime_type, file_size, stored_path)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING *`,
    [file.originalname, stored.storedName, file.mimetype, file.size, stored.relativePath]
  );

  return formatTemplate(template);
}

async function listTemplates() {
  const rows = await query('SELECT * FROM templates ORDER BY uploaded_at DESC');
  return rows.map(formatTemplate);
}

async function getTemplateById(templateId) {
  const rows = await query('SELECT * FROM templates WHERE id = $1', [templateId]);
  return formatTemplate(rows[0]);
}

async function deleteTemplate(templateId) {
  const template = await getTemplateById(templateId);
  if (!template) {
    const error = new Error('Template not found');
    error.status = 404;
    throw error;
  }

  if (template.stored_path) {
    await deleteFromStorage(template.stored_path);
  }

  await query('DELETE FROM templates WHERE id = $1', [templateId]);
  return { id: templateId };
}

function normalizeHexColor(value) {
  if (!value || typeof value !== 'string') return null;
  const hex = value.trim().toLowerCase();
  if (/^#?[0-9a-f]{6}$/.test(hex)) {
    return hex.startsWith('#') ? hex : `#${hex}`;
  }
  return null;
}

async function updateTemplatePlacement(
  templateId,
  {
    text_x_pixels,
    text_y_pixels,
    canvas_width,
    canvas_height,
    text_font_size,
    text_align,
    text_color_hex,
  }
) {
  const template = await getTemplateById(templateId);
  if (!template) {
    const error = new Error('Template not found');
    error.status = 404;
    throw error;
  }

  // Convert pixel coordinates to ratios for database storage
  const normalizedX = (text_x_pixels !== undefined && canvas_width) ? text_x_pixels / canvas_width : null;
  const normalizedY = (text_y_pixels !== undefined && canvas_height) ? text_y_pixels / canvas_height : null;
  const normalizedFont = text_font_size ? Number(text_font_size) : null;
  const allowedAlignments = new Set(['left', 'center', 'right']);
  let normalizedAlign = template.text_align || 'center';
  if (typeof text_align === 'string' && allowedAlignments.has(text_align.toLowerCase())) {
    normalizedAlign = text_align.toLowerCase();
  } else if (text_align === null) {
    normalizedAlign = null;
  }

  const normalizedColor = normalizeHexColor(text_color_hex);

  // Update template positioning data in database
  await query(
    `UPDATE templates
     SET text_x_ratio = $1, text_y_ratio = $2, text_font_size = $3, text_align = $4, text_color_hex = $5,
         text_x_pixels = $6, text_y_pixels = $7, canvas_width = $8, canvas_height = $9
     WHERE id = $10`,
    [
      normalizedX,
      normalizedY,
      normalizedFont,
      normalizedAlign,
      normalizedColor,
      text_x_pixels ?? null,
      text_y_pixels ?? null,
      canvas_width ?? null,
      canvas_height ?? null,
      templateId,
    ]
  );
  
  return getTemplateById(templateId);
}

module.exports = {
  saveTemplateFile,
  listTemplates,
  getTemplateById,
  deleteTemplate,
  updateTemplatePlacement,
};
