const express = require('express');
const router = express.Router();
const { getCart, addToCart, updateCartItem, removeFromCart, clearCart } = require('./cart.controller');
const { protect } = require('../../middlewares/auth');

router.use(protect);
router.get('/', getCart);
router.post('/', addToCart);
router.patch('/:itemId', updateCartItem);
router.delete('/:itemId', removeFromCart);
router.delete('/', clearCart);

module.exports = router;
