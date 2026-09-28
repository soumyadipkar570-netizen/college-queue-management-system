const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');
const { verifyJWT, authorizeRoles } = require('../middleware/auth');

// Current assigned counter for logged-in staff member
router.get('/assigned-counter', verifyJWT, authorizeRoles('LIBRARY_STAFF', 'FEES_STAFF'), staffController.getAssignedCounter);

module.exports = router;
