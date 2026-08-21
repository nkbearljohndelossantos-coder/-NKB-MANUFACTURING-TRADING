const express = require('express');
const router = express.Router();
const deliveryController = require('../controllers/deliveryController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

router.use(authenticateToken);

router.get('/', deliveryController.getDeliveries);
router.get('/:id', deliveryController.getDeliveryById);
router.get('/:id/pdf', deliveryController.getDeliveryPdf);
router.post('/', requireRole(['ADMIN', 'WAREHOUSE', 'MANAGER']), deliveryController.createDelivery);
router.post('/:id/finalize', requireRole(['ADMIN', 'WAREHOUSE', 'MANAGER']), deliveryController.finalizeDelivery);

module.exports = router;
