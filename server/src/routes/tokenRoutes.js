const express = require('express');
const router = express.Router();
const tokenController = require('../controllers/tokenController');
const staffController = require('../controllers/staffController');
const { verifyJWT, authorizeRoles } = require('../middleware/auth');

// Student endpoints
router.post('/', verifyJWT, authorizeRoles('STUDENT'), tokenController.createToken);
router.get('/active', verifyJWT, authorizeRoles('STUDENT'), tokenController.getActiveTokens);
router.get('/history', verifyJWT, authorizeRoles('STUDENT'), tokenController.getHistory);
router.get('/:id', verifyJWT, tokenController.getTokenById);
router.post('/:id/cancel', verifyJWT, tokenController.cancelToken);

// Staff token transition endpoints (PRD & Architecture spec)
router.post('/:id/recall', verifyJWT, authorizeRoles('LIBRARY_STAFF', 'FEES_STAFF'), staffController.recall);
router.post('/:id/serve', verifyJWT, authorizeRoles('LIBRARY_STAFF', 'FEES_STAFF'), staffController.startServing);
router.post('/:id/complete', verifyJWT, authorizeRoles('LIBRARY_STAFF', 'FEES_STAFF'), staffController.complete);
router.post('/:id/skip', verifyJWT, authorizeRoles('LIBRARY_STAFF', 'FEES_STAFF'), staffController.skip);

module.exports = router;
