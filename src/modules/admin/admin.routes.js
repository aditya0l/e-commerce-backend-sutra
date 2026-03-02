const express = require('express');
const router = express.Router();
const admin = require('./admin.controller');
const { authenticate, requireRole } = require('../../middlewares/auth');
const upload = require('../../middlewares/upload.middleware');

const isAdmin = [authenticate, requireRole('ADMIN')];

// Dashboard
router.get('/stats', ...isAdmin, admin.getDashboardStats);

// Image Uploads
router.post('/upload', ...isAdmin, upload.single('image'), admin.uploadImage);

// Orders
router.get('/orders', ...isAdmin, admin.listOrders);
router.patch('/orders/:id/status', ...isAdmin, admin.updateOrderStatus);

// Products
router.get('/products', ...isAdmin, admin.listProducts);
router.post('/products', ...isAdmin, admin.createProduct);
router.put('/products/:id', ...isAdmin, admin.updateProduct);
router.delete('/products/:id', ...isAdmin, admin.deleteProduct);

// Categories
router.get('/categories', ...isAdmin, admin.listCategories);
router.post('/categories', ...isAdmin, admin.createCategory);
router.put('/categories/:id', ...isAdmin, admin.updateCategory);

// Reviews
router.get('/reviews', ...isAdmin, admin.listReviews);
router.delete('/reviews/:id', ...isAdmin, admin.deleteReview);

// Bank Info
router.get('/bank-info', ...isAdmin, admin.getBankInfo);
router.put('/bank-info', ...isAdmin, admin.updateBankInfo);

module.exports = router;
