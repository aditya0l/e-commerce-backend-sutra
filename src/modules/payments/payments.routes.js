const express = require('express');
const router = express.Router();
const { createStripeIntent, stripeWebhook } = require('./payments.controller');
const { protect } = require('../../middlewares/auth');
const { checkoutLimiter } = require('../../middlewares/rateLimiter');

// Webhook — raw body, no auth, signature-verified
router.post('/webhook/stripe', stripeWebhook);

// Payment intent — optionally authenticated (supports guest orders)
router.post('/stripe/intent', checkoutLimiter, createStripeIntent);

module.exports = router;
