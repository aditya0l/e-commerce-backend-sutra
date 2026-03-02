const { Redis } = require('ioredis');
const logger = require('./logger');

const redis = new Redis(process.env.REDIS_URL, {
    lazyConnect: true,
    retryStrategy: (times) => Math.min(times * 50, 2000),
    maxRetriesPerRequest: 3,
});

redis.on('connect', () => logger.info('Redis connected'));
redis.on('error', (err) => logger.error('Redis error:', err));

module.exports = redis;
