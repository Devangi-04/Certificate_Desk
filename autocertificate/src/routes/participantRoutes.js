const express = require('express');
const upload = require('../utils/upload');
const {
  importParticipants,
  getParticipants,
  deleteParticipant,
  deleteAllParticipants,
  deleteParticipants,
} = require('../controllers/participantController');

const router = express.Router();

router.get('/', getParticipants);
router.post('/import', upload.single('sheet'), importParticipants);
router.delete('/:participantId', deleteParticipant);
router.delete('/all', deleteAllParticipants);
router.post('/delete', deleteParticipants);

module.exports = router;
