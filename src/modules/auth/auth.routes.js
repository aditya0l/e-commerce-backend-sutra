const express = require('express');
const router = express.Router();
const { register, login, refresh, logout } = require('./auth.controller');
const { authLimiter } = require('../../middlewares/rateLimiter');
const { protect } = require('../../middlewares/auth');

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/refresh', refresh);
router.post('/logout', protect, logout);

module.exports = router;
