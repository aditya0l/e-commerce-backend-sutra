const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const crypto = require('crypto');
const prisma = require('../../config/prisma');
const { AppError } = require('../../utils/AppError');
const { notificationQueue } = require('../../workers/queue');

// ─── Stripe: Create Payment Intent ──────────────────────────────────────────
const createStripeIntent = async (req, res, next) => {
    try {
        const { orderId } = req.body;
        if (!orderId) throw new AppError('orderId is required.', 400);

        const order = await prisma.order.findFirst({
            where: {
                id: orderId,
                status: 'PENDING_PAYMENT',
                // Allow both authenticated and guest orders
                ...(req.user ? { userId: req.user.id } : {}),
            },
        });
        if (!order) throw new AppError('Order not found or already paid.', 404);

        const intent = await stripe.paymentIntents.create({
            amount: Math.round(Number(order.totalAmount) * 100), // EUR cents
            currency: order.currency.toLowerCase(),
            metadata: { orderId: order.id, idempotencyKey: order.idempotencyKey },
            idempotency_key: order.idempotencyKey,
            description: `Sutra Vedic Order #${order.id.slice(0, 8).toUpperCase()}`,
        });

        await prisma.order.update({
            where: { id: orderId },
            data: { stripePaymentIntentId: intent.id },
        });

        res.json({ success: true, data: { clientSecret: intent.client_secret } });
    } catch (err) { next(err); }
};

// ─── Stripe Webhook Handler ──────────────────────────────────────────────────
const stripeWebhook = async (req, res, next) => {
    let event;
    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            req.headers['stripe-signature'],
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
    }

    try {
        // Idempotency check
        const processed = await prisma.processedWebhook.findUnique({ where: { eventId: event.id } });
        if (processed) return res.json({ received: true });

        if (event.type === 'payment_intent.succeeded') {
            const intent = event.data.object;
            const orderId = intent.metadata.orderId;

            await prisma.$transaction(async (tx) => {
                const order = await tx.order.findUnique({ where: { id: orderId } });
                if (!order || order.status === 'PAID') return;

                await tx.order.update({ where: { id: orderId }, data: { status: 'PAID' } });

                await tx.payment.create({
                    data: {
                        orderId,
                        provider: 'STRIPE',
                        providerId: intent.id,
                        amount: intent.amount / 100,
                        currency: (intent.currency || 'eur').toUpperCase(),
                        status: 'SUCCESS',
                    },
                });

                // Confirm inventory: move reserved → confirmed (decrement reserved)
                const items = await tx.orderItem.findMany({ where: { orderId } });
                for (const item of items) {
                    await tx.inventory.update({
                        where: { productId: item.productId },
                        data: { reservedQuantity: { decrement: item.quantity } },
                    });
                }

                await tx.processedWebhook.create({ data: { eventId: event.id, provider: 'STRIPE' } });
            });

            // Queue confirmation email (outside transaction)
            const order = await prisma.order.findUnique({ where: { id: orderId } });
            const emailTo = order.guestEmail || (
                order.userId ? (await prisma.user.findUnique({ where: { id: order.userId }, select: { email: true, name: true } })) : null
            );

            if (emailTo) {
                await notificationQueue.add('order-confirmation', {
                    orderId,
                    userEmail: typeof emailTo === 'string' ? emailTo : emailTo.email,
                    userName: order.guestName || (typeof emailTo === 'object' ? emailTo.name : ''),
                });
            }
        }

        if (event.type === 'payment_intent.payment_failed') {
            const intent = event.data.object;
            const orderId = intent.metadata.orderId;

            await prisma.$transaction(async (tx) => {
                const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
                if (!order || order.status !== 'PENDING_PAYMENT') return;

                await tx.order.update({ where: { id: orderId }, data: { status: 'PAYMENT_FAILED' } });

                // Release reserved stock
                for (const item of order.items) {
                    await tx.inventory.update({
                        where: { productId: item.productId },
                        data: {
                            stockQuantity: { increment: item.quantity },
                            reservedQuantity: { decrement: item.quantity },
                        },
                    });
                }

                await tx.processedWebhook.create({ data: { eventId: event.id, provider: 'STRIPE' } });
            });
        }

        res.json({ received: true });
    } catch (err) { next(err); }
};

module.exports = { createStripeIntent, stripeWebhook };
