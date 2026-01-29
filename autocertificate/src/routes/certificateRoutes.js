const express = require('express');
const {
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
} = require('../controllers/certificateController');

const router = express.Router();

// Standard certificate operations
router.get('/', getCertificates);
router.post('/generate', postGenerateCertificates);
router.post('/:certificateId/send', postSendCertificate);
router.get('/:certificateId/download', downloadCertificate);
router.get('/export', getCertificatesCsv);
router.get('/export/excel', getCertificatesExcel);

// Certificate visibility and verification endpoints
router.post('/:certificateId/hide', hideCertificateById);
router.post('/:certificateId/unhide', unhideCertificateById);
router.delete('/:certificateId/revoke', revokeCertificate);
router.get('/:certificateId/verify', verifyCertificate);
router.get('/:certificateId/qr', getQRCode);

module.exports = router;
