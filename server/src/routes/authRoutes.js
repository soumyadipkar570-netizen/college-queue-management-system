const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyJWT } = require('../middleware/auth');

router.post('/login', authController.login);
router.get('/me', verifyJWT, authController.getMe);

module.exports = router;
