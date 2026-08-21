const express = require('express');
const router = express.Router();
const varianceController = require('../controllers/varianceController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

router.use(authenticateToken);

router.get('/', varianceController.getVariances);
router.put('/:id/review', requireRole(['ADMIN', 'MANAGER', 'WAREHOUSE', 'SALES']), varianceController.reviewVariance);
router.put('/:id/approve', requireRole(['ADMIN', 'MANAGER']), varianceController.approveVariance);
router.put('/:id/client-confirm', requireRole(['ADMIN', 'CLIENT']), varianceController.clientConfirmVariance);

module.exports = router;
