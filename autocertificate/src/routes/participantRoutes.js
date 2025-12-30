const express = require('express');
const upload = require('../utils/upload');
const {
  importParticipants,
  getParticipants,
  deleteParticipant,
} = require('../controllers/participantController');

const router = express.Router();

router.get('/', getParticipants);
router.post('/import', upload.single('sheet'), importParticipants);
router.delete('/:participantId', deleteParticipant);

module.exports = router;
