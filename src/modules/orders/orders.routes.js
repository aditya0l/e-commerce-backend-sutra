const express = require('express');
const router = express.Router();
const { createOrder, listOrders, getOrder } = require('./orders.controller');
const { protect, optionalAuth } = require('../../middlewares/auth');
const { checkoutLimiter } = require('../../middlewares/rateLimiter');

// POST /orders — strict login required
router.post('/', checkoutLimiter, protect, createOrder);

// GET /orders — requires login
router.get('/', protect, listOrders);
router.get('/:id', protect, getOrder);

module.exports = router;
