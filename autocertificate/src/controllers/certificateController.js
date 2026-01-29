const {
  listCertificates,
  generateCertificates,
  sendCertificateById,
  getCertificateById,
  hideCertificate,
  unhideCertificate,
  softDeleteCertificate,
  getCertificateByIdForVerification,
  getCertificateQRCode,
} = require('../services/certificateService');
const XLSX = require('xlsx');
const { success } = require('../utils/response');

function escapeCsvValue(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCertificateUrl(req, pdfPath) {
  if (!pdfPath) return '';
  if (pdfPath.startsWith('http://') || pdfPath.startsWith('https://')) {
    return pdfPath;
  }
  const normalized = pdfPath.startsWith('/') ? pdfPath : `/${pdfPath}`;
  return new URL(normalized, `${req.protocol}://${req.get('host')}`).href;
}

async function getCertificates(req, res) {
  const certificates = await listCertificates();
  const normalized = certificates.map((cert) => ({
    ...cert,
    pdf_path: buildCertificateUrl(req, cert.pdf_path),
  }));
  return success(res, { certificates: normalized });
}

async function postGenerateCertificates(req, res) {
  const { templateId, participantIds = [], sendEmail = false, eventName } = req.body || {};
  if (!templateId) {
    throw new Error('templateId is required');
  }
  const summary = await generateCertificates({
    templateId,
    participantIds,
    sendEmail,
    eventName,
    req, // Pass req object for QR code URL generation
  });
  return success(res, summary, 201);
}

async function postSendCertificate(req, res) {
  const { certificateId } = req.params;
  const result = await sendCertificateById(certificateId, req.body || {});
  return success(res, result);
}

async function getCertificatesExcel(req, res) {
  const certificates = await listCertificates();
  
  const headers = [
    'Certificate ID',
    'Participant Name',
    'Participant Email',
    'Template Name',
    'Status',
    'Delivery Status',
    'PDF URL',
    'Sent At',
    'Created At',
    'Updated At',
  ];

  const rows = certificates.map((cert) => {
    const pdfUrl = buildCertificateUrl(req, cert.pdf_path);
    return [
      cert.id,
      cert.full_name,
      cert.email,
      cert.template_name,
      cert.status,
      cert.delivery_status,
      pdfUrl,
      cert.sent_at ? new Date(cert.sent_at).toISOString() : '',
      cert.created_at ? new Date(cert.created_at).toISOString() : '',
      cert.updated_at ? new Date(cert.updated_at).toISOString() : '',
    ];
  });

  // Combine headers and rows for proper Excel export
  const worksheetData = [headers, ...rows];
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Certificates');

  const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="certificate-dispatch-${Date.now()}.xlsx"`
  );
  return res.send(excelBuffer);
}

async function getCertificatesCsv(req, res) {
  const certificates = await listCertificates();
  const baseUrl = `${req.protocol}://${req.get('host')}`;

  const headers = [
    'certificate_id',
    'participant_name',
    'participant_email',
    'template_name',
    'status',
    'delivery_status',
    'pdf_url',
    'sent_at',
    'created_at',
    'updated_at',
  ];

  const rows = certificates.map((cert) => {
    const pdfUrl = buildCertificateUrl(req, cert.pdf_path);
    return [
      cert.id,
      cert.full_name,
      cert.email,
      cert.template_name,
      cert.status,
      cert.delivery_status,
      pdfUrl,
      cert.sent_at ? new Date(cert.sent_at).toISOString() : '',
      cert.created_at ? new Date(cert.created_at).toISOString() : '',
      cert.updated_at ? new Date(cert.updated_at).toISOString() : '',
    ]
      .map(escapeCsvValue)
      .join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="certificate-dispatch-${Date.now()}.csv"`
  );
  return res.send(csvContent);
}

async function downloadCertificate(req, res) {
  const { certificateId } = req.params;
  // Use verification function to allow download of hidden but valid certificates
  const certificate = await getCertificateByIdForVerification(certificateId);
  
  if (!certificate || !certificate.pdf_path) {
    const error = new Error('Certificate PDF not found');
    error.status = 404;
    throw error;
  }

  const { readFromStorage } = require('../utils/fileStorage');
  const pdfBuffer = await readFromStorage(certificate.pdf_path);
  
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="certificate-${certificateId}.pdf"`
  );
  return res.send(pdfBuffer);
}

async function hideCertificateById(req, res) {
  const { certificateId } = req.params;
  const certificate = await hideCertificate(certificateId);
  
  if (!certificate) {
    const error = new Error('Certificate not found or already deleted');
    error.status = 404;
    throw error;
  }
  
  return success(res, { certificate, message: 'Certificate hidden from dashboard' });
}

async function unhideCertificateById(req, res) {
  const { certificateId } = req.params;
  const certificate = await unhideCertificate(certificateId);
  
  if (!certificate) {
    const error = new Error('Certificate not found or deleted');
    error.status = 404;
    throw error;
  }
  
  return success(res, { certificate, message: 'Certificate restored to dashboard' });
}

async function revokeCertificate(req, res) {
  const { certificateId } = req.params;
  const certificate = await softDeleteCertificate(certificateId);
  
  if (!certificate) {
    const error = new Error('Certificate not found');
    error.status = 404;
    throw error;
  }
  
  return success(res, { certificate, message: 'Certificate revoked and marked as invalid' });
}

async function verifyCertificate(req, res) {
  const { certificateId } = req.params;
  // Use verification function that ignores visibility but respects soft delete
  const certificate = await getCertificateByIdForVerification(certificateId);
  
  if (!certificate) {
    return success(res, { valid: false, reason: 'Certificate not found or has been revoked' });
  }
  
  if (certificate.status !== 'generated') {
    return success(res, { valid: false, reason: 'Certificate generation incomplete' });
  }
  
  return success(res, {
    valid: true,
    certificate: {
      id: certificate.id,
      certificate_full_id: certificate.certificate_full_id || `CD/${new Date().getFullYear()}/${String(certificate.id).padStart(6, '0')}`,
      participant_name: certificate.full_name,
      template_name: certificate.template_name,
      created_at: certificate.created_at,
      status: certificate.status,
      delivery_status: certificate.delivery_status,
      verification_url: certificate.verification_url,
      qr_code_path: certificate.qr_code_path
    }
  });
}

async function getQRCode(req, res) {
  const { certificateId } = req.params;
  try {
    const certificate = await getCertificateQRCode(certificateId);
    
    const { readFromStorage } = require('../utils/fileStorage');
    const qrBuffer = await readFromStorage(certificate.qr_code_path);
    
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    return res.send(qrBuffer);
  } catch (error) {
    const err = new Error('QR code not found');
    err.status = 404;
    throw err;
  }
}

module.exports = {
  getCertificates,
  postGenerateCertificates,
  postSendCertificate,
  getCertificatesCsv,
  getCertificatesExcel,
  downloadCertificate,
  hideCertificateById,
  unhideCertificateById,
  revokeCertificate,
  verifyCertificate,
  getQRCode,
};
