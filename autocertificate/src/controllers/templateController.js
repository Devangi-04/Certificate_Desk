const {
  saveTemplateFile,
  listTemplates,
  deleteTemplate,
  updateTemplatePlacement,
} = require('../services/templateService');
const { success } = require('../utils/response');

async function uploadTemplate(req, res) {
  if (!req.file) {
    throw new Error('Certificate template file is required');
  }
  const template = await saveTemplateFile(req.file);
  return success(res, { template }, 201);
}

async function getTemplates(req, res) {
  const templates = await listTemplates();
  return success(res, { templates });
}

async function removeTemplate(req, res) {
  const { templateId } = req.params;
  if (!templateId) {
    throw new Error('templateId is required');
  }
  const result = await deleteTemplate(templateId);
  return success(res, result);
}

async function updatePlacement(req, res) {
  const { templateId } = req.params;
  if (!templateId) {
    throw new Error('templateId is required');
  }
  const template = await updateTemplatePlacement(templateId, req.body || {});
  return success(res, { template });
}

module.exports = {
  uploadTemplate,
  getTemplates,
  removeTemplate,
  updatePlacement,
};
