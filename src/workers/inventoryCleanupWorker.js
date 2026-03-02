require('dotenv').config();
const { Worker } = require('bullmq');
const redis = require('../config/redis');
const prisma = require('../config/prisma');
const logger = require('../config/logger');

// Releases stock for orders stuck in PENDING_PAYMENT for > 30 minutes
const inventoryCleanupWorker = new Worker(
    'inventory-cleanup',
    async (job) => {
        const staleThreshold = new Date(Date.now() - 30 * 60 * 1000); // 30 mins ago

        const staleOrders = await prisma.order.findMany({
            where: { status: 'PENDING_PAYMENT', createdAt: { lt: staleThreshold } },
            include: { items: true },
        });

        logger.info(`Inventory cleanup: ${staleOrders.length} stale orders found.`);

        for (const order of staleOrders) {
            await prisma.$transaction(async (tx) => {
                for (const item of order.items) {
                    await tx.inventory.update({
                        where: { variantId: item.variantId },
                        data: {
                            stockQuantity: { increment: item.quantity },
                            reservedQuantity: { decrement: item.quantity },
                        },
                    });
                }
                await tx.order.update({
                    where: { id: order.id },
                    data: { status: 'CANCELLED' },
                });
            });
            logger.info(`Released stock for stale order: ${order.id}`);
        }
    },
    { connection: redis }
);

inventoryCleanupWorker.on('failed', (job, err) => logger.error(`Inventory cleanup failed: ${err.message}`));

module.exports = inventoryCleanupWorker;
