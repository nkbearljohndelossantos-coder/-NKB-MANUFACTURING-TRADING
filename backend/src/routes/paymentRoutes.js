const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

router.use(authenticateToken);

router.get('/', paymentController.getPayments);
router.get('/:id/pdf', paymentController.getPaymentPdf);
router.post('/', requireRole(['ADMIN', 'ACCOUNTING', 'MANAGER']), paymentController.recordPayment);

module.exports = router;
