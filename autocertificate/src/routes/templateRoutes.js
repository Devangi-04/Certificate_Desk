const express = require('express');
const upload = require('../utils/upload');
const { uploadTemplate, getTemplates, removeTemplate, updatePlacement } = require('../controllers/templateController');

const router = express.Router();

router.get('/', getTemplates);
router.post('/upload', upload.single('template'), uploadTemplate);
router.delete('/:templateId', removeTemplate);
router.put('/:templateId/placement', updatePlacement);

module.exports = router;
