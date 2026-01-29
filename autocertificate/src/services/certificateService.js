const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const { query } = require('../config/database');
const {
  saveBufferToStorage,
  readFromStorage,
} = require('../utils/fileStorage');
const { getTemplateById } = require('./templateService');
const { listParticipants, getParticipantsByIds } = require('./participantService');
const { sendCertificateEmail } = require('./emailService');
const { generateCertificateQRCode, generateQRCodeDataURL, updateCertificateWithQRCode } = require('./qrCodeService');

function parseColor(hex = '#000000') {
  if (!hex || typeof hex !== 'string') return { r: 0, g: 0, b: 0 };
  const sanitized = hex.replace('#', '');
  const bigint = parseInt(sanitized, 16);
  if (Number.isNaN(bigint)) return { r: 0, g: 0, b: 0 };
  if (sanitized.length === 6) {
    return {
      r: ((bigint >> 16) & 255) / 255,
      g: ((bigint >> 8) & 255) / 255,
      b: (bigint & 255) / 255,
    };
  }
  return { r: 0, g: 0, b: 0 };
}

function resolvePosition(value, dimension, fallback) {
  if (value === undefined || value === null) {
    return fallback;
  }
  const num = Number(value);
  if (Number.isNaN(num)) {
    return fallback;
  }
  if (num >= 0 && num <= 1) {
    return dimension * num;
  }
  if (num < 0 && num >= -1) {
    return dimension * (1 + num);
  }
  return num;
}

function clampRatio(value) {
  if (value === undefined || value === null) return null;
  const num = Number(value);
  if (Number.isNaN(num)) return null;
  if (!Number.isFinite(num)) return null;
  return Math.min(1, Math.max(0, num));
}

function deriveRatio(ratioValue, pixelValue, canvasSize) {
  const normalizedRatio = clampRatio(ratioValue);
  if (normalizedRatio !== null) {
    return normalizedRatio;
  }
  if (
    pixelValue !== undefined &&
    pixelValue !== null &&
    canvasSize &&
    Number(canvasSize) > 0
  ) {
    const px = Number(pixelValue);
    const canvas = Number(canvasSize);
    if (!Number.isNaN(px) && !Number.isNaN(canvas) && canvas > 0) {
      return clampRatio(px / canvas);
    }
  }
  return null;
}

function slugify(value = '') {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

async function logCertificateDelivery(certificateId, status, message = null) {
  try {
    await query(
      `INSERT INTO certificate_delivery_logs (certificate_id, status, message)
       VALUES ($1, $2, $3)`,
      [certificateId, status, message]
    );
  } catch (err) {
    console.error('Failed to log certificate delivery', { certificateId, status, message, err });
  }
}

async function ensureCertificateRecord(participantId, templateId) {
  const rows = await query(
    'SELECT * FROM certificates WHERE participant_id = $1 AND template_id = $2',
    [participantId, templateId]
  );
  if (rows.length) {
    return rows[0];
  }
  
  // Generate certificate number and year
  const currentYear = new Date().getFullYear();
  const [yearResult] = await query(
    'SELECT COALESCE(MAX(CAST(certificate_number AS INTEGER)), 0) + 1 as next_number FROM certificates WHERE certificate_year = $1',
    [currentYear]
  );
  const certificateNumber = yearResult.next_number;
  const certificateFullId = `CD/${currentYear}/${String(certificateNumber).padStart(6, '0')}`;
  
  const [inserted] = await query(
    `INSERT INTO certificates (participant_id, template_id, status, certificate_number, certificate_year, certificate_full_id)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [participantId, templateId, 'pending', Number(certificateNumber), currentYear, `CD/${currentYear}/temp`]
  );
  
  // Update certificate_full_id with the actual database ID
  const [updated] = await query(
    'UPDATE certificates SET certificate_full_id = $1 WHERE id = $2 RETURNING *',
    [`CD/${currentYear}/${inserted.id}`, inserted.id]
  );
  return updated;
}

async function listCertificates(filters = {}) {
  const { templateId = null, participantIds = null, deliveryStatus = null, includeHidden = false } = filters;
  const conditions = ['c.deleted_at IS NULL'];
  const params = [];

  if (!includeHidden) {
    conditions.push('c.is_visible = TRUE');
  }

  if (templateId) {
    params.push(Number(templateId));
    conditions.push(`c.template_id = $${params.length}`);
  }

  if (Array.isArray(participantIds) && participantIds.length) {
    params.push(participantIds.map(Number));
    conditions.push(`c.participant_id = ANY($${params.length}::bigint[])`);
  }

  if (deliveryStatus) {
    params.push(deliveryStatus);
    conditions.push(`c.delivery_status = $${params.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  // Add filter to exclude archived templates from UI lists
  const finalWhereClause = whereClause ? `${whereClause} AND t.is_archived = FALSE` : 'WHERE t.is_archived = FALSE';

  return query(
    `SELECT c.*, p.full_name, p.email, t.original_name AS template_name
     FROM certificates c
     JOIN participants p ON p.id = c.participant_id
     JOIN templates t ON t.id = c.template_id
     ${finalWhereClause}
     ORDER BY c.updated_at DESC`,
    params
  );
}

async function generateCertificates({ templateId, participantIds = [], sendEmail = false, eventName, req = null }) {
  if (!templateId) {
    throw new Error('templateId is required');
  }
  const template = await getTemplateById(templateId);
  if (!template) {
    throw new Error('Template not found');
  }
  if (!template.stored_path) {
    throw new Error('Template file path is missing. Please re-upload the template.');
  }

  const basePdfBuffer = await readFromStorage(template.stored_path);

  const participants = participantIds.length
    ? await getParticipantsByIds(participantIds)
    : await listParticipants();

  if (!participants.length) {
    throw new Error('No participants found to generate certificates');
  }

  const envFontSize = Number(process.env.CERT_FONT_SIZE || 36);
  const envTextXRaw = process.env.CERT_TEXT_X;
  const envTextYRaw = process.env.CERT_TEXT_Y;
  const fontColor = template.text_color_hex ? parseColor(template.text_color_hex) : parseColor(process.env.CERT_FONT_COLOR || '#1f2933');
  const envTextAlign = (process.env.CERT_TEXT_ALIGN || 'center').toLowerCase();
  const allowedAlignments = new Set(['left', 'center', 'right']);
  const textAlign = allowedAlignments.has(template.text_align?.toLowerCase())
    ? template.text_align.toLowerCase()
    : (allowedAlignments.has(envTextAlign) ? envTextAlign : 'center');

  const anchorXRatio =
    deriveRatio(template.text_x_ratio, template.text_x_pixels, template.canvas_width);
  const anchorYRatio =
    deriveRatio(template.text_y_ratio, template.text_y_pixels, template.canvas_height);

  const summary = {
    total: participants.length,
    generated: 0,
    emailed: 0,
    failures: [],
  };

  for (const participant of participants) {
    try {
      const certificateRecord = await ensureCertificateRecord(participant.id, templateId);
      const pdfDoc = await PDFDocument.load(basePdfBuffer);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const page = pdfDoc.getPages()[0];
      const pageWidth = page.getWidth();
      const pageHeight = page.getHeight();
      const text = participant.full_name || participant.extra_data?.name || 'Participant';
      const fontSize = template.text_font_size || envFontSize;
      const textWidth = helveticaBold.widthOfTextAtSize(text, fontSize);
      const fontHeight = helveticaBold.heightAtSize(fontSize);

      // Use same text width calculation as frontend for consistency
      const previewTextWidth = helveticaBold.widthOfTextAtSize("Participant Name", fontSize);

      // Determine anchor coordinates (the point the user positioned in the UI).
      const fallbackAnchorX = resolvePosition(envTextXRaw, pageWidth, pageWidth / 2);
      const fallbackAnchorYTop = resolvePosition(
        envTextYRaw,
        pageHeight,
        pageHeight / 2
      );

      const anchorX = anchorXRatio !== null ? pageWidth * anchorXRatio : fallbackAnchorX;
      const anchorYTop =
        anchorYRatio !== null ? pageHeight * anchorYRatio : fallbackAnchorYTop;

      // Convert from top-origin preview coordinates to PDF bottom-origin coordinates.
      // Use actual text width for perfect centering of each participant name
      let drawX = anchorX;
      if (textAlign === 'center') {
        drawX -= textWidth / 2; // Use actual participant name width
      } else if (textAlign === 'right') {
        drawX -= textWidth;
      }

      let drawY = pageHeight - anchorYTop - fontHeight;

      // Ensure text stays within page bounds
      drawX = Math.max(0, Math.min(pageWidth - textWidth, drawX));

      console.log('PLACEMENT_DEBUG', {
        participant: { id: participant.id, name: participant.full_name },
        template: {
          id: template.id,
          canvasWidth: template.canvas_width,
          canvasHeight: template.canvas_height,
          pixelAnchor: { x: template.text_x_pixels, y: template.text_y_pixels },
          ratioAnchor: { x: template.text_x_ratio, y: template.text_y_ratio },
        },
        page: { width: pageWidth, height: pageHeight },
        font: { size: fontSize, width: textWidth, height: fontHeight },
        alignment: textAlign,
        anchor: {
          ratio: { x: anchorXRatio, y: anchorYRatio },
          pdf: { x: anchorX, yFromTop: anchorYTop },
        },
        draw: { x: drawX, yBaseline: drawY },
        centerAdjustment: textAlign === 'center' ? `-${textWidth / 2} (actual name)` : '0',
      });

      console.log(
        `Name positioned at: x=${drawX.toFixed(2)}, y=${drawY.toFixed(2)}, align=${textAlign}`
      );

      // Generate QR code for embedding in PDF
      const baseUrl = `${req?.protocol}://${req?.get('host')}` || process.env.BASE_URL || 'http://localhost:4000';
      const verificationUrl = `${baseUrl}/verify.html?id=${certificateRecord.id}`;
      const qrCodeDataURL = await generateQRCodeDataURL(certificateRecord.id, baseUrl);
      
      // Embed QR code in PDF if template has positioning
      if (template.qr_x_ratio !== null && template.qr_y_ratio !== null) {
        const qrSize = template.qr_size || 80; // Default QR code size
        const qrX = pageWidth * (template.qr_x_ratio || 0.85); // Default to right side
        const qrY = pageHeight * (template.qr_y_ratio || 0.15); // Default to top
        
        // Convert QR data URL to image bytes
        const qrBase64 = qrCodeDataURL.replace(/^data:image\/png;base64,/, '');
        const qrImageBytes = Buffer.from(qrBase64, 'base64');
        
        // Embed QR code image in PDF
        const qrImage = await pdfDoc.embedPng(qrImageBytes);
        const qrImageDims = qrImage.scale(qrSize / Math.max(qrImage.width, qrImage.height));
        
        // Draw QR code on PDF
        page.drawImage(qrImage, {
          x: qrX - qrImageDims.width / 2,
          y: pageHeight - qrY - qrImageDims.height / 2,
          width: qrImageDims.width,
          height: qrImageDims.height,
        });
        
        console.log(`QR code embedded at: x=${qrX.toFixed(2)}, y=${qrY.toFixed(2)}, size=${qrSize}`);
      }

      page.drawText(text, {
        x: drawX,
        y: drawY,
        size: fontSize,
        font: helveticaBold,
        color: rgb(fontColor.r, fontColor.g, fontColor.b),
      });

      const pdfBytes = await pdfDoc.save();
      const nameSlug = slugify(text || `participant-${participant.id}`);
      const eventSlug = slugify(eventName || template.original_name || 'certificate');
      const timestamp = Date.now();
      const customFileName = `${nameSlug}-${eventSlug}-${timestamp}`;
      const stored = await saveBufferToStorage(
        Buffer.from(pdfBytes),
        'generated',
        '.pdf',
        customFileName,
        { contentType: 'application/pdf' }
      );

      const storedPath = stored.relativePath.startsWith('http://') || stored.relativePath.startsWith('https://')
        ? stored.relativePath
        : stored.relativePath.replace(/^\/+/, '');

      const [updatedCert] = await query(
        `UPDATE certificates
         SET status = $1, pdf_path = $2, last_error = NULL, updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        ['generated', storedPath, certificateRecord.id]
      );

      const record = updatedCert || {
        ...certificateRecord,
        status: 'generated',
        pdf_path: storedPath,
      };

      // Generate QR code file for separate access and update database
      try {
        const { qrCodePath, verificationUrl: fileVerificationUrl } = await generateCertificateQRCode(record.id, baseUrl);
        await updateCertificateWithQRCode(record.id, qrCodePath, fileVerificationUrl);
        
        // Update record with QR code info
        record.qr_code_path = qrCodePath;
        record.verification_url = fileVerificationUrl;
        
        console.log(`QR code generated for certificate ${record.id}: ${fileVerificationUrl}`);
      } catch (qrError) {
        console.error('Failed to generate QR code for certificate:', record.id, qrError);
        // Don't fail the entire process if QR generation fails
      }

      summary.generated += 1;

      if (sendEmail) {
        try {
          await sendCertificateEmail(
            participant,
            record,
            { eventName }
          );
          await query(
            `UPDATE certificates
             SET delivery_status = 'sent', delivery_message = NULL, sent_at = NOW()
             WHERE id = $1`,
            [certificateRecord.id]
          );
          await logCertificateDelivery(certificateRecord.id, 'sent');
          summary.emailed += 1;
        } catch (emailErr) {
          await query(
            `UPDATE certificates
             SET delivery_status = 'failed', delivery_message = $2
             WHERE id = $1`,
            [certificateRecord.id, emailErr.message || 'Email send failed']
          );
          await logCertificateDelivery(certificateRecord.id, 'failed', emailErr.message || null);
          throw emailErr;
        }
      }
    } catch (err) {
      console.error('Certificate generation failed', err);
      summary.failures.push({ participantId: participant.id, message: err.message });
    }
  }

  return summary;
}

async function sendCertificateById(certificateId, options = {}) {
  const rows = await query(
    `SELECT c.*, p.full_name, p.email
     FROM certificates c
     JOIN participants p ON p.id = c.participant_id
     WHERE c.id = $1`,
    [certificateId]
  );
  if (!rows.length) {
    throw new Error('Certificate not found');
  }
  const certificate = rows[0];
  if (!certificate.pdf_path) {
    throw new Error('Certificate PDF not generated yet');
  }
  const participant = {
    id: certificate.participant_id,
    full_name: certificate.full_name,
    email: certificate.email,
  };
  try {
    await sendCertificateEmail(participant, certificate, options);
    await query(
      `UPDATE certificates
       SET delivery_status = 'sent', delivery_message = NULL, sent_at = NOW()
       WHERE id = $1`,
      [certificateId]
    );
    await logCertificateDelivery(certificateId, 'sent');
    return { certificateId, status: 'sent' };
  } catch (err) {
    await query(
      `UPDATE certificates
       SET delivery_status = 'failed', delivery_message = $2
       WHERE id = $1`,
      [certificateId, err.message || 'Email send failed']
    );
    await logCertificateDelivery(certificateId, 'failed', err.message || null);
    throw err;
  }
}

async function getCertificateById(certificateId, includeHidden = false) {
  const conditions = ['c.id = $1', 'c.deleted_at IS NULL'];
  const params = [certificateId];
  
  if (!includeHidden) {
    conditions.push('c.is_visible = TRUE');
  }
  
  const [certificate] = await query(
    `SELECT c.*, p.full_name, p.email, t.original_name as template_name
     FROM certificates c
     JOIN participants p ON c.participant_id = p.id
     JOIN templates t ON c.template_id = t.id
     WHERE ${conditions.join(' AND ')}`,
    params
  );
  return certificate;
}

async function getCertificateQRCode(certificateId) {
  const [certificate] = await query(
    `SELECT qr_code_path, verification_url, deleted_at
     FROM certificates 
     WHERE id = $1 AND deleted_at IS NULL`,
    [certificateId]
  );
  
  if (!certificate || !certificate.qr_code_path) {
    throw new Error('QR code not found for this certificate');
  }
  
  return certificate;
}

async function hideCertificate(certificateId) {
  const [updated] = await query(
    `UPDATE certificates 
     SET is_visible = FALSE, updated_at = NOW() 
     WHERE id = $1 AND deleted_at IS NULL 
     RETURNING *`,
    [certificateId]
  );
  return updated;
}

async function unhideCertificate(certificateId) {
  const [updated] = await query(
    `UPDATE certificates 
     SET is_visible = TRUE, updated_at = NOW() 
     WHERE id = $1 AND deleted_at IS NULL 
     RETURNING *`,
    [certificateId]
  );
  return updated;
}

async function softDeleteCertificate(certificateId) {
  const [updated] = await query(
    `UPDATE certificates 
     SET deleted_at = NOW(), is_visible = FALSE, updated_at = NOW() 
     WHERE id = $1 
     RETURNING *`,
    [certificateId]
  );
  return updated;
}

async function getCertificateByIdForVerification(certificateId) {
  // For QR verification, we ignore visibility but respect soft delete
  const [certificate] = await query(
    `SELECT c.*, p.full_name, p.email, t.original_name as template_name
     FROM certificates c
     JOIN participants p ON c.participant_id = p.id
     JOIN templates t ON c.template_id = t.id
     WHERE c.id = $1 AND c.deleted_at IS NULL`,
    [certificateId]
  );
  return certificate;
}

module.exports = {
  listCertificates,
  generateCertificates,
  sendCertificateById,
  getCertificateById,
  hideCertificate,
  unhideCertificate,
  softDeleteCertificate,
  getCertificateByIdForVerification,
  getCertificateQRCode,
};
