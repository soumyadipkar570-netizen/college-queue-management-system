const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');
const { verifyJWT } = require('../middleware/auth');

router.get('/', verifyJWT, departmentController.getDepartments);
router.get('/:id/services', verifyJWT, departmentController.getDepartmentServices);

module.exports = router;
