const express = require('express');
const templateRouter = require('./templateRoutes');
const participantRouter = require('./participantRoutes');
const certificateRouter = require('./certificateRoutes');

const router = express.Router();

router.use('/templates', templateRouter);
router.use('/participants', participantRouter);
router.use('/certificates', certificateRouter);

module.exports = router;
