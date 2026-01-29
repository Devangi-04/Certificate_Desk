const QRCode = require('qrcode');
const { saveBufferToStorage } = require('../utils/fileStorage');

/**
 * Generate QR code for certificate verification
 * @param {number} certificateId - Certificate ID
 * @param {string} baseUrl - Base URL of the application
 * @returns {Promise<{qrCodePath: string, verificationUrl: string}>}
 */
async function generateCertificateQRCode(certificateId, baseUrl = null) {
  // Construct verification URL
  const verificationUrl = `${baseUrl || process.env.BASE_URL || 'http://localhost:4000'}/verify.html?id=${certificateId}`;
  
  try {
    // Generate QR code as buffer
    const qrCodeBuffer = await QRCode.toBuffer(verificationUrl, {
      width: 200,
      margin: 1,
      color: {
        dark: '#000000',  // Black dots
        light: '#FFFFFF'  // White background
      }
    });

    // Save QR code to storage
    const timestamp = Date.now();
    const fileName = `qr-certificate-${certificateId}-${timestamp}`;
    const stored = await saveBufferToStorage(
      qrCodeBuffer,
      'qr-codes',
      '.png',
      fileName,
      { contentType: 'image/png' }
    );

    const qrCodePath = stored.relativePath.startsWith('http://') || stored.relativePath.startsWith('https://')
      ? stored.relativePath
      : stored.relativePath.replace(/^\/+/, '');

    return {
      qrCodePath,
      verificationUrl
    };
  } catch (error) {
    console.error('Failed to generate QR code for certificate:', certificateId, error);
    throw new Error(`QR code generation failed: ${error.message}`);
  }
}

/**
 * Generate QR code data URL for embedding in PDF
 * @param {number} certificateId - Certificate ID
 * @param {string} baseUrl - Base URL of the application
 * @returns {Promise<string>} - Data URL of QR code
 */
async function generateQRCodeDataURL(certificateId, baseUrl = null) {
  const verificationUrl = `${baseUrl || process.env.BASE_URL || 'http://localhost:4000'}/verify.html?id=${certificateId}`;
  
  try {
    const dataURL = await QRCode.toDataURL(verificationUrl, {
      width: 150,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    return dataURL;
  } catch (error) {
    console.error('Failed to generate QR code data URL for certificate:', certificateId, error);
    throw new Error(`QR code data URL generation failed: ${error.message}`);
  }
}

/**
 * Update certificate with QR code information
 * @param {number} certificateId - Certificate ID
 * @param {string} qrCodePath - Path to QR code image
 * @param {string} verificationUrl - Verification URL
 */
async function updateCertificateWithQRCode(certificateId, qrCodePath, verificationUrl) {
  const { query } = require('../config/database');
  
  await query(
    `UPDATE certificates 
     SET qr_code_path = $1, verification_url = $2, updated_at = NOW()
     WHERE id = $3`,
    [qrCodePath, verificationUrl, certificateId]
  );
}

module.exports = {
  generateCertificateQRCode,
  generateQRCodeDataURL,
  updateCertificateWithQRCode
};
