const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

router.use(authenticateToken);

router.get('/', productController.getProducts);
router.get('/categories', productController.getCategories);
router.get('/:id', productController.getProductById);
router.post('/', requireRole(['ADMIN', 'MANAGER']), productController.createProduct);
router.put('/:id', requireRole(['ADMIN', 'MANAGER']), productController.updateProduct);
router.post('/:id/batches', requireRole(['ADMIN', 'MANAGER', 'WAREHOUSE']), productController.addBatch);

module.exports = router;
