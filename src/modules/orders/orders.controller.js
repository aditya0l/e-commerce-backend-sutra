const prisma = require('../../config/prisma');
const mailer = require('../../utils/mailer');
const { v4: uuidv4 } = require('uuid');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function orderShape(order) {
    const addr = order.shippingAddress;
    return {
        id: order.id,
        status: order.status.toLowerCase(),
        paymentMethod: order.paymentMethod || 'bank_transfer',
        subtotal: Number(order.subtotal),
        tax: Number(order.tax),
        shipping: Number(order.shipping),
        total: Number(order.totalAmount),
        totalAmount: Number(order.totalAmount),
        currency: order.currency,
        guestEmail: order.guestEmail,
        guestName: order.guestName,
        adminNote: order.adminNote,
        trackingNumber: order.trackingNumber,
        courierName: order.courierName,
        createdAt: order.createdAt,
        shippingAddress: addr ? {
            firstName: addr.firstName,
            lastName: addr.lastName,
            address: addr.address,
            city: addr.city,
            state: addr.state,
            zipCode: addr.zipCode,
            country: addr.country,
            phone: addr.phone,
        } : null,
        items: (order.items || []).map(i => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: Number(i.unitPrice),
            productSnapshot: i.productSnapshot,
        })),
        user: order.user ? { id: order.user.id, name: order.user.name, email: order.user.email } : null,
    };
}

async function getBankInfo() {
    return prisma.bankInfo.upsert({
        where: { id: 'singleton' },
        create: { id: 'singleton', accountHolder: '', bankName: '', iban: '', bic: '', instructions: '' },
        update: {},
    });
}

// ─── Create Order ─────────────────────────────────────────────────────────────

async function createOrder(req, res) {
    const userId = req.user.id; // guaranteed by select protect middleware
    const { items, shippingAddress, locale = 'fr' } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Order must include at least one item.' });
    }

    const productIds = items.map(i => i.productId);
    const products = await prisma.product.findMany({
        where: { id: { in: productIds }, isActive: true },
        include: { inventory: true },
    });

    if (products.length !== productIds.length) {
        return res.status(400).json({ success: false, message: 'One or more products not found.' });
    }

    // Validate stock
    for (const item of items) {
        const product = products.find(p => p.id === item.productId);
        const available = (product.inventory?.stockQuantity || 0) - (product.inventory?.reservedQuantity || 0);
        if (available < item.quantity) {
            const name = typeof product.name === 'object' ? (product.name[locale] || product.name.fr) : product.name;
            return res.status(409).json({ success: false, message: `Insufficient stock for: ${name}` });
        }
    }

    // Calculate totals
    let subtotal = 0;
    const orderItems = items.map(item => {
        const product = products.find(p => p.id === item.productId);
        const price = Number(product.price);
        subtotal += price * item.quantity;
        return {
            productId: product.id,
            quantity: item.quantity,
            unitPrice: price,
            productSnapshot: {
                name: product.name,
                slug: product.slug,
                images: product.images,
            },
        };
    });

    const tax = Math.round(subtotal * 0.20 * 100) / 100;
    const totalAmount = Math.round((subtotal + tax) * 100) / 100;

    // Create order in transaction
    const order = await prisma.$transaction(async (tx) => {
        // Reserve stock
        for (const item of items) {
            await tx.inventory.update({
                where: { productId: item.productId },
                data: { reservedQuantity: { increment: item.quantity } },
            });
        }

        // Create shipping address for user
        let shippingAddressId = null;
        if (shippingAddress) {
            const addr = await tx.address.create({
                data: { userId, ...shippingAddress },
            });
            shippingAddressId = addr.id;
        }

        return tx.order.create({
            data: {
                userId,
                shippingAddressId,
                subtotal,
                tax,
                shipping: 0,
                totalAmount,
                currency: 'EUR',
                status: 'PENDING_PAYMENT',
                paymentMethod: 'bank_transfer',
                paymentProvider: 'BANK_TRANSFER',
                idempotencyKey: uuidv4(),
                items: { create: orderItems },
            },
            include: { items: true, user: true, shippingAddress: true },
        });
    });

    // Fire emails (non-blocking)
    const bankInfo = await getBankInfo();
    mailer.orderPendingPayment(order, bankInfo).catch(() => { });
    mailer.adminNewOrder(order).catch(() => { });

    return res.status(201).json({ success: true, data: orderShape(order) });
}

// ─── List Orders (customer) ───────────────────────────────────────────────────

async function listOrders(req, res) {
    const userId = req.user.id;
    const orders = await prisma.order.findMany({
        where: { userId },
        include: { items: true, shippingAddress: true },
        orderBy: { createdAt: 'desc' },
    });
    return res.json({ success: true, data: orders.map(orderShape) });
}

// ─── Get Order by ID (customer) ───────────────────────────────────────────────

async function getOrder(req, res) {
    const userId = req.user?.id;
    const { id } = req.params;
    const order = await prisma.order.findUnique({
        where: { id },
        include: { items: true, shippingAddress: true, user: true },
    });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    if (order.userId && order.userId !== userId) {
        return res.status(403).json({ success: false, message: 'Forbidden.' });
    }
    return res.json({ success: true, data: orderShape(order) });
}

module.exports = { createOrder, listOrders, getOrder };
