const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

router.post('/login', authController.login);
router.get('/me', authenticateToken, authController.getMe);
router.get('/staff', authenticateToken, requireRole(['ADMIN', 'MANAGER']), authController.getStaffUsers);

module.exports = router;
