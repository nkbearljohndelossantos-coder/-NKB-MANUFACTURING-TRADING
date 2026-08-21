const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

router.use(authenticateToken);

router.get('/dashboard', reportController.getDashboardStats);
router.get('/sales', requireRole(['ADMIN', 'MANAGER', 'SALES', 'ACCOUNTING']), reportController.getSalesReport);
router.get('/variances', requireRole(['ADMIN', 'MANAGER', 'SALES', 'WAREHOUSE', 'ACCOUNTING']), reportController.getVarianceReport);
router.get('/receivables', requireRole(['ADMIN', 'MANAGER', 'ACCOUNTING']), reportController.getReceivablesAgingReport);

module.exports = router;
