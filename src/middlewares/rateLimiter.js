const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

// Global API limiter
const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 min
    max: 200,
    message: { success: false, message: 'Too many requests. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Strict limiter for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 mins
    max: 10,
    message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Per-user checkout limiter
const checkoutLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    keyGenerator: (req) => req.user?.id || ipKeyGenerator(req),
    message: { success: false, message: 'Too many checkout attempts. Please slow down.' },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = { apiLimiter, authLimiter, checkoutLimiter };
