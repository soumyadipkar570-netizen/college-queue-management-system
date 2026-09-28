const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyJWT, authorizeRoles } = require('../middleware/auth');

// All admin routes require verifyJWT + authorizeRoles('ADMIN')
router.use(verifyJWT, authorizeRoles('ADMIN'));

// Analytics & Reports
router.get('/analytics', adminController.getAnalytics);
router.get('/reports', adminController.getReports);

// Service Management
router.get('/services', adminController.getServices);
router.post('/services', adminController.createService);
router.put('/services/:id', adminController.updateService);
router.delete('/services/:id', adminController.deleteService);

// Counter Management
router.get('/counters', adminController.getCounters);
router.post('/counters', adminController.createCounter);
router.put('/counters/:id', adminController.updateCounter);
router.post('/counters/assign', adminController.assignStaffCounter);

// Users Management
router.get('/staff', adminController.getStaffList);
router.get('/students', adminController.getStudentList);

// Settings & Audit Logs
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSetting);
router.get('/audit-logs', adminController.getAuditLogs);

module.exports = router;
