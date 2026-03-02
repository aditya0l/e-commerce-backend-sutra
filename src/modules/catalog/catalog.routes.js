const express = require('express');
const router = express.Router();
const { listProducts, getProduct, listCategories, getProductReviews } = require('./catalog.controller');

router.get('/', listProducts);
router.get('/categories', listCategories);
router.get('/:slug', getProduct);
router.get('/:slug/reviews', getProductReviews);

module.exports = router;
