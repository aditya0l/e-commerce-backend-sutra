const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../../config/prisma');
const { AppError } = require('../../utils/AppError');

const signAccessToken = (userId) =>
    jwt.sign({ sub: userId }, process.env.JWT_ACCESS_SECRET, { expiresIn: process.env.JWT_ACCESS_EXPIRES });

const signRefreshToken = (userId) =>
    jwt.sign({ sub: userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES });

// POST /api/auth/register
const register = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) throw new AppError('Email already registered.', 409);

        const passwordHash = await bcrypt.hash(password, 12);
        const user = await prisma.user.create({
            data: { name, email, passwordHash, role: 'USER' },
            select: { id: true, name: true, email: true, role: true },
        });

        const accessToken = signAccessToken(user.id);
        const refreshToken = signRefreshToken(user.id);

        // Store hashed refresh token
        const hashedRefresh = await bcrypt.hash(refreshToken, 10);
        await prisma.refreshToken.create({ data: { userId: user.id, tokenHash: hashedRefresh } });

        res.status(201).json({ success: true, data: { user, accessToken, refreshToken } });
    } catch (err) { next(err); }
};

// POST /api/auth/login
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
            throw new AppError('Invalid email or password.', 401);
        }
        if (!user.isActive) throw new AppError('Account is deactivated.', 403);

        const accessToken = signAccessToken(user.id);
        const refreshToken = signRefreshToken(user.id);
        const hashedRefresh = await bcrypt.hash(refreshToken, 10);
        await prisma.refreshToken.create({ data: { userId: user.id, tokenHash: hashedRefresh } });

        res.json({
            success: true,
            data: { user: { id: user.id, name: user.name, email: user.email, role: user.role }, accessToken, refreshToken },
        });
    } catch (err) { next(err); }
};

// POST /api/auth/refresh
const refresh = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) throw new AppError('Refresh token required.', 400);

        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const storedTokens = await prisma.refreshToken.findMany({ where: { userId: decoded.sub, isRevoked: false } });

        let valid = null;
        for (const t of storedTokens) {
            if (await bcrypt.compare(refreshToken, t.tokenHash)) { valid = t; break; }
        }
        if (!valid) throw new AppError('Invalid or expired refresh token.', 401);

        // Rotate: revoke old, issue new
        await prisma.refreshToken.update({ where: { id: valid.id }, data: { isRevoked: true } });

        const newAccess = signAccessToken(decoded.sub);
        const newRefresh = signRefreshToken(decoded.sub);
        const hashedNew = await bcrypt.hash(newRefresh, 10);
        await prisma.refreshToken.create({ data: { userId: decoded.sub, tokenHash: hashedNew } });

        res.json({ success: true, data: { accessToken: newAccess, refreshToken: newRefresh } });
    } catch (err) {
        if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') return next(new AppError('Invalid refresh token.', 401));
        next(err);
    }
};

// POST /api/auth/logout
const logout = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) return res.json({ success: true });

        const decoded = jwt.decode(refreshToken);
        if (decoded?.sub) {
            const tokens = await prisma.refreshToken.findMany({ where: { userId: decoded.sub, isRevoked: false } });
            for (const t of tokens) {
                if (await bcrypt.compare(refreshToken, t.tokenHash)) {
                    await prisma.refreshToken.update({ where: { id: t.id }, data: { isRevoked: true } });
                    break;
                }
            }
        }
        res.json({ success: true, message: 'Logged out successfully.' });
    } catch (err) { next(err); }
};

module.exports = { register, login, refresh, logout };
