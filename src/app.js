const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const { apiLimiter } = require('./middlewares/rateLimiter');
const { errorHandler } = require('./middlewares/errorHandler');
const routes = require('./routes');

const app = express();

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// ─── Security Middleware ───────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true,
}));

// ─── Body Parsing ─────────────────────────────────────────────────────────────
// Raw body needed for Stripe/Razorpay webhook signature verification
app.use('/api/payments/webhook/stripe', express.raw({ type: 'application/json' }));
app.use('/api/payments/webhook/razorpay', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ─── Request Logging ─────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined'));
}

// ─── Global Rate Limiter ───────────────────────────────────────────────────────
app.use('/api', apiLimiter);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api', routes);

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
