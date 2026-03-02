const { Queue } = require('bullmq');
const redis = require('../config/redis');

const connection = redis;

const notificationQueue = new Queue('notifications', { connection });
const inventoryCleanupQueue = new Queue('inventory-cleanup', { connection });

module.exports = { notificationQueue, inventoryCleanupQueue };
