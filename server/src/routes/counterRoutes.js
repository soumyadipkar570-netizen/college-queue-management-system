const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');
const { verifyJWT, authorizeRoles } = require('../middleware/auth');

router.get('/:id/queue', verifyJWT, staffController.getCounterQueue);
router.post('/:id/toggle-status', verifyJWT, staffController.toggleCounterStatus);
router.post('/:id/call-next', verifyJWT, authorizeRoles('LIBRARY_STAFF', 'FEES_STAFF'), staffController.callNext);
router.get('/:id/stats', verifyJWT, staffController.getCounterStats);

module.exports = router;
