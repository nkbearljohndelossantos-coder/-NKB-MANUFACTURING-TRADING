const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

router.use(authenticateToken);

router.get('/', orderController.getOrders);
router.get('/:id', orderController.getOrderById);
router.get('/:id/pdf', orderController.getOrderPdf);
router.post('/', requireRole(['ADMIN', 'MANAGER', 'SALES', 'CLIENT']), orderController.createOrder);
router.put('/:id/confirm', requireRole(['ADMIN', 'MANAGER', 'SALES']), orderController.confirmOrder);
router.put('/:id/override-credit', requireRole(['ADMIN', 'MANAGER']), orderController.overrideCredit);

module.exports = router;
