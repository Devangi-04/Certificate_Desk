const express = require('express');
const {
  getCertificates,
  postGenerateCertificates,
  postSendCertificate,
  getCertificatesCsv,
  getCertificatesExcel,
  downloadCertificate,
} = require('../controllers/certificateController');

const router = express.Router();

router.get('/', getCertificates);
router.post('/generate', postGenerateCertificates);
router.post('/:certificateId/send', postSendCertificate);
router.get('/:certificateId/download', downloadCertificate);
router.get('/export', getCertificatesCsv);
router.get('/export/excel', getCertificatesExcel);

module.exports = router;
