const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

router.use(authenticateToken);
router.get('/', requireRole(['ADMIN', 'MANAGER']), auditController.getAuditLogs);

module.exports = router;
