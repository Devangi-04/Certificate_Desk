const {
  importParticipantsFromWorkbook,
  listParticipants,
  createParticipant,
  updateParticipant,
  deleteParticipant,
  deleteAllParticipants,
  deleteParticipantsByIds,
} = require('../services/participantService');
const { success } = require('../utils/response');

async function importParticipants(req, res) {
  if (!req.file) {
    throw new Error('Participant sheet (Excel/CSV) is required');
  }

  const result = await importParticipantsFromWorkbook(req.file.buffer, req.file.originalname);
  return success(res, result, 201);
}

async function getParticipants(req, res) {
  const participants = await listParticipants();
  return success(res, { participants });
}

async function createParticipantHandler(req, res) {
  const participant = await createParticipant(req.body || {});
  return success(res, { participant }, 201);
}

async function updateParticipantHandler(req, res) {
  const { participantId } = req.params;
  if (!participantId) {
    throw new Error('participantId is required');
  }
  const updated = await updateParticipant(participantId, req.body || {});
  return success(res, { participant: updated });
}

async function deleteParticipantHandler(req, res) {
  const { participantId } = req.params;
  if (!participantId) {
    throw new Error('participantId is required');
  }
  const result = await deleteParticipant(participantId);
  return success(res, result);
}

async function deleteAllParticipantsHandler(req, res) {
  const result = await deleteAllParticipants();
  return success(res, result);
}

async function deleteParticipantsHandler(req, res) {
  const { participantIds } = req.body || {};
  if (!participantIds || !Array.isArray(participantIds)) {
    throw new Error('participantIds array is required');
  }
  const result = await deleteParticipantsByIds(participantIds);
  return success(res, result);
}

module.exports = {
  importParticipants,
  getParticipants,
  createParticipant: createParticipantHandler,
  updateParticipant: updateParticipantHandler,
  deleteParticipant: deleteParticipantHandler,
  deleteAllParticipants: deleteAllParticipantsHandler,
  deleteParticipants: deleteParticipantsHandler,
};
