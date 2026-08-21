const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

router.use(authenticateToken);

router.get('/', invoiceController.getInvoices);
router.get('/:id', invoiceController.getInvoiceById);
router.get('/:id/pdf', invoiceController.getInvoicePdf);
router.post('/generate-from-delivery/:deliveryId', requireRole(['ADMIN', 'ACCOUNTING', 'MANAGER']), invoiceController.generateInvoiceFromDelivery);

module.exports = router;
