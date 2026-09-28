const express = require('express');
const router = express.Router();
const queueController = require('../controllers/queueController');
const { verifyJWT } = require('../middleware/auth');

router.get('/status', verifyJWT, queueController.getLiveQueueStatus);
router.get('/:id/status', verifyJWT, queueController.getServiceQueueStatus);

module.exports = router;
