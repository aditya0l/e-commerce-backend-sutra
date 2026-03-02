const express = require('express');
const router = express.Router();

// Admin-only inventory view
const prisma = require('../../config/prisma');
const { protect } = require('../../middlewares/auth');
const { restrict } = require('../../middlewares/rbac');

router.get('/', protect, restrict('ADMIN'), async (req, res, next) => {
    try {
        const inventory = await prisma.inventory.findMany({
            include: {
                variant: {
                    include: { product: { select: { name: true, slug: true } } },
                },
            },
            orderBy: { stockQuantity: 'asc' },
        });
        res.json({ success: true, data: inventory });
    } catch (err) { next(err); }
});

module.exports = router;
