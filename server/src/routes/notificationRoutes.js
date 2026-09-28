const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { verifyJWT } = require('../middleware/auth');

router.use(verifyJWT);

router.get('/', notificationController.getNotifications);
router.put('/:id/read', notificationController.markRead);
router.put('/read-all', notificationController.markAllRead);

module.exports = router;
