const jwt = require('jsonwebtoken');
const { AppError } = require('../utils/AppError');
const prisma = require('../config/prisma');

// ─── Strict auth — requires valid JWT ────────────────────────────────────────
const protect = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new AppError('Authentication required. Please log in.', 401);
        }
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        const user = await prisma.user.findUnique({
            where: { id: decoded.sub },
            select: { id: true, email: true, role: true, isActive: true },
        });
        if (!user || !user.isActive) throw new AppError('User account not found or deactivated.', 401);
        req.user = user;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') return next(new AppError('Token expired. Please refresh.', 401));
        if (err.name === 'JsonWebTokenError') return next(new AppError('Invalid token.', 401));
        next(err);
    }
};

// alias
const authenticate = protect;

// ─── Optional auth — attaches user if token present, else continues as guest ──
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) return next();
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        const user = await prisma.user.findUnique({
            where: { id: decoded.sub },
            select: { id: true, email: true, role: true, isActive: true },
        });
        if (user && user.isActive) req.user = user;
        next();
    } catch {
        next(); // silently ignore invalid token for optional auth
    }
};

// ─── Role guard ───────────────────────────────────────────────────────────────
const requireRole = (...roles) => (req, res, next) => {
    if (!req.user) return next(new AppError('Authentication required.', 401));
    if (!roles.includes(req.user.role)) {
        return next(new AppError(`Access denied. Required role: ${roles.join(' or ')}.`, 403));
    }
    next();
};

module.exports = { protect, authenticate, optionalAuth, requireRole };
