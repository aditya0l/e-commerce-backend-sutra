require('dotenv').config();
const { Worker } = require('bullmq');
const redis = require('../config/redis');
const logger = require('../config/logger');
const { sendEmail, sendWhatsApp } = require('../modules/notifications/notifications.service');
const prisma = require('../config/prisma');

const notificationWorker = new Worker(
    'notifications',
    async (job) => {
        const { name, data } = job;

        if (name === 'order-confirmation') {
            const { orderId, userEmail, userName } = data;
            const order = await prisma.order.findUnique({
                where: { id: orderId },
                include: { items: { include: { variant: { include: { product: true } } } } },
            });

            const itemsList = order.items
                .map((i) => `${i.variant.product.name} x${i.quantity} @ ₹${i.unitPrice}`)
                .join('\n');

            await sendEmail({
                to: userEmail,
                subject: `Order Confirmed — #${orderId.slice(0, 8).toUpperCase()}`,
                html: `<h2>Hi ${userName},</h2>
               <p>Your order has been confirmed! 🎉</p>
               <pre>${itemsList}</pre>
               <b>Total: ₹${order.totalAmount}</b>
               <p>We'll update you when your order ships.</p>`,
            });

            logger.info(`Order confirmation email sent: ${orderId}`);
        }

        if (name === 'order-shipped') {
            const { userPhone, trackingNumber, courier } = data;
            await sendWhatsApp({
                to: userPhone,
                message: `📦 Your order has been shipped!\nCourier: ${courier}\nTracking: ${trackingNumber}`,
            });
        }
    },
    {
        connection: redis,
        concurrency: 5,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
    }
);

notificationWorker.on('completed', (job) => logger.info(`Job ${job.id} [${job.name}] completed`));
notificationWorker.on('failed', (job, err) => logger.error(`Job ${job.id} [${job.name}] failed: ${err.message}`));

module.exports = notificationWorker;
