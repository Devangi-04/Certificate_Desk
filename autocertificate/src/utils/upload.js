const multer = require('multer');

const MB = 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * MB,
  },
});

module.exports = upload;
