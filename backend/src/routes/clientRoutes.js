const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

router.use(authenticateToken);

router.get('/', requireRole(['ADMIN', 'MANAGER', 'SALES', 'ACCOUNTING']), clientController.getClients);
router.get('/:id', requireRole(['ADMIN', 'MANAGER', 'SALES', 'ACCOUNTING', 'CLIENT']), clientController.getClientById);
router.post('/', requireRole(['ADMIN', 'MANAGER', 'SALES']), clientController.createClient);
router.put('/:id', requireRole(['ADMIN', 'MANAGER', 'SALES', 'ACCOUNTING']), clientController.updateClient);

module.exports = router;
