const prisma = require('../../config/prisma');
const { AppError } = require('../../utils/AppError');

// GET /api/cart
const getCart = async (req, res, next) => {
    try {
        const cart = await prisma.cartItem.findMany({
            where: { userId: req.user.id },
            include: {
                variant: {
                    include: {
                        product: { select: { id: true, name: true, slug: true, images: true } },
                        inventory: { select: { stockQuantity: true } },
                    },
                },
            },
        });

        const subtotal = cart.reduce((sum, item) => sum + Number(item.variant.price) * item.quantity, 0);
        res.json({ success: true, data: { items: cart, subtotal: subtotal.toFixed(2) } });
    } catch (err) { next(err); }
};

// POST /api/cart
const addToCart = async (req, res, next) => {
    try {
        const { variantId, quantity } = req.body;
        if (!variantId || quantity < 1) throw new AppError('variantId and quantity are required.', 400);

        // Check stock
        const inventory = await prisma.inventory.findUnique({ where: { variantId } });
        if (!inventory) throw new AppError('Product variant not found.', 404);
        if (inventory.stockQuantity < quantity) throw new AppError(`Insufficient stock. Only ${inventory.stockQuantity} available.`, 400);

        // Upsert cart item
        const item = await prisma.cartItem.upsert({
            where: { userId_variantId: { userId: req.user.id, variantId } },
            update: { quantity: { increment: quantity } },
            create: { userId: req.user.id, variantId, quantity },
        });

        res.status(201).json({ success: true, data: item });
    } catch (err) { next(err); }
};

// PATCH /api/cart/:itemId
const updateCartItem = async (req, res, next) => {
    try {
        const { quantity } = req.body;
        const { itemId } = req.params;

        if (quantity < 1) {
            await prisma.cartItem.deleteMany({ where: { id: itemId, userId: req.user.id } });
            return res.json({ success: true, message: 'Item removed from cart.' });
        }

        const item = await prisma.cartItem.updateMany({
            where: { id: itemId, userId: req.user.id },
            data: { quantity },
        });

        if (item.count === 0) throw new AppError('Cart item not found.', 404);
        res.json({ success: true, message: 'Cart updated.' });
    } catch (err) { next(err); }
};

// DELETE /api/cart/:itemId
const removeFromCart = async (req, res, next) => {
    try {
        await prisma.cartItem.deleteMany({ where: { id: req.params.itemId, userId: req.user.id } });
        res.json({ success: true, message: 'Item removed from cart.' });
    } catch (err) { next(err); }
};

// DELETE /api/cart
const clearCart = async (req, res, next) => {
    try {
        await prisma.cartItem.deleteMany({ where: { userId: req.user.id } });
        res.json({ success: true, message: 'Cart cleared.' });
    } catch (err) { next(err); }
};

module.exports = { getCart, addToCart, updateCartItem, removeFromCart, clearCart };
