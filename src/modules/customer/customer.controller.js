const prisma = require('../../config/prisma');
const { AppError } = require('../../utils/AppError');

// GET /api/customer/profile
const getProfile = async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { id: true, name: true, email: true, role: true, createdAt: true },
        });
        res.json({ success: true, data: user });
    } catch (err) { next(err); }
};

// PATCH /api/customer/profile
const updateProfile = async (req, res, next) => {
    try {
        const { name } = req.body;
        const user = await prisma.user.update({
            where: { id: req.user.id },
            data: { name },
            select: { id: true, name: true, email: true },
        });
        res.json({ success: true, data: user });
    } catch (err) { next(err); }
};

// GET /api/customer/addresses
const getAddresses = async (req, res, next) => {
    try {
        const addresses = await prisma.address.findMany({ where: { userId: req.user.id } });
        res.json({ success: true, data: addresses });
    } catch (err) { next(err); }
};

// POST /api/customer/addresses
const addAddress = async (req, res, next) => {
    try {
        const { name, phone, line1, line2, city, state, postalCode, country, isDefault } = req.body;

        if (isDefault) {
            await prisma.address.updateMany({ where: { userId: req.user.id }, data: { isDefault: false } });
        }

        const address = await prisma.address.create({
            data: { userId: req.user.id, name, phone, line1, line2, city, state, postalCode, country: country || 'IN', isDefault: isDefault || false },
        });
        res.status(201).json({ success: true, data: address });
    } catch (err) { next(err); }
};

// DELETE /api/customer/addresses/:id
const deleteAddress = async (req, res, next) => {
    try {
        await prisma.address.deleteMany({ where: { id: req.params.id, userId: req.user.id } });
        res.json({ success: true, message: 'Address removed.' });
    } catch (err) { next(err); }
};

module.exports = { getProfile, updateProfile, getAddresses, addAddress, deleteAddress };
