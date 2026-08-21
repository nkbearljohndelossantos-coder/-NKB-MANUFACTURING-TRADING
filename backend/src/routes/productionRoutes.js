const express = require('express');
const router = express.Router();
const productionController = require('../controllers/productionController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

router.use(authenticateToken);

// Production Orders
router.get('/orders', requireRole(['ADMIN', 'MANAGER', 'SALES', 'PRODUCTION', 'WAREHOUSE', 'CLIENT']), productionController.getProductionOrders);
router.get('/orders/:id', requireRole(['ADMIN', 'MANAGER', 'SALES', 'PRODUCTION', 'WAREHOUSE', 'CLIENT']), productionController.getProductionOrderById);
router.post('/orders', requireRole(['ADMIN', 'MANAGER', 'PRODUCTION', 'SALES']), productionController.createProductionOrder);
router.put('/orders/:id/start', requireRole(['ADMIN', 'MANAGER', 'PRODUCTION']), productionController.startProduction);
router.post('/orders/:id/record-output', requireRole(['ADMIN', 'MANAGER', 'PRODUCTION']), productionController.recordOutput);

// Production Variances & Dispositions
router.get('/variances', requireRole(['ADMIN', 'MANAGER', 'PRODUCTION', 'SALES', 'ACCOUNTING', 'CLIENT']), productionController.getVariances);
router.post('/variances/:id/disposition', requireRole(['ADMIN', 'MANAGER']), productionController.assignDisposition);
router.post('/variances/:id/resolve-shortage', requireRole(['ADMIN', 'MANAGER']), productionController.resolveShortage);

module.exports = router;
