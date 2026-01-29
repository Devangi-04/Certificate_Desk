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

async function listTemplates({ includeArchived = false } = {}) {
  const conditions = [];
  if (!includeArchived) {
    conditions.push('is_archived = FALSE');
  }
  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = await query(`SELECT * FROM templates ${whereClause} ORDER BY uploaded_at DESC`);
  return rows.map(formatTemplate);
}

async function getTemplateById(templateId, { includeArchived = false } = {}) {
  const params = [templateId];
  const conditions = ['id = $1'];
  if (!includeArchived) {
    conditions.push('is_archived = FALSE');
  }
  const rows = await query(`SELECT * FROM templates WHERE ${conditions.join(' AND ')}`, params);
  return formatTemplate(rows[0]);
}

async function deleteTemplate(templateId, { hardDelete = false } = {}) {
  const template = await getTemplateById(templateId, { includeArchived: true });
  if (!template) {
    const error = new Error('Template not found');
    error.status = 404;
    throw error;
  }

  if (hardDelete) {
    if (template.stored_path) {
      await deleteFromStorage(template.stored_path);
    }
    await query('DELETE FROM templates WHERE id = $1', [templateId]);
    return { id: templateId, archived: false, deleted: true };
  }

  await query(
    `UPDATE templates 
     SET is_archived = TRUE, archived_at = NOW(), updated_at = NOW() 
     WHERE id = $1`,
    [templateId]
  );

  return { id: templateId, archived: true };
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
    qr_x_ratio,
    qr_y_ratio,
    qr_size,
  }
) {
  console.log('=== TEMPLATE SERVICE: UPDATE PLACEMENT ===');
  console.log('Template ID:', templateId);
  console.log('Received QR data:', { qr_x_ratio, qr_y_ratio, qr_size });
  console.log('All received data:', arguments[1]);
  
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
  
  // Normalize QR code positioning
  const normalizedQrX = qr_x_ratio !== undefined ? Number(qr_x_ratio) : null;
  const normalizedQrY = qr_y_ratio !== undefined ? Number(qr_y_ratio) : null;
  const normalizedQrSize = qr_size ? Number(qr_size) : null;

  console.log('Normalized QR data:', { normalizedQrX, normalizedQrY, normalizedQrSize });

  // Update template positioning data in database
  await query(
    `UPDATE templates
     SET text_x_ratio = $1, text_y_ratio = $2, text_font_size = $3, text_align = $4, text_color_hex = $5,
         text_x_pixels = $6, text_y_pixels = $7, canvas_width = $8, canvas_height = $9,
         qr_x_ratio = $10, qr_y_ratio = $11, qr_size = $12
     WHERE id = $13`,
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
      normalizedQrX,
      normalizedQrY,
      normalizedQrSize,
      templateId,
    ]
  );
  
  const updatedTemplate = await getTemplateById(templateId);
  console.log('Updated template QR data:', {
    qr_x_ratio: updatedTemplate.qr_x_ratio,
    qr_y_ratio: updatedTemplate.qr_y_ratio,
    qr_size: updatedTemplate.qr_size
  });
  
  return updatedTemplate;
}

module.exports = {
  saveTemplateFile,
  listTemplates,
  getTemplateById,
  deleteTemplate,
  updateTemplatePlacement,
};
