// dotenv is already loaded in server.js, but load it here too for safety
// so DATABASE_URL is available before PrismaClient is instantiated.
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');

const prisma = new PrismaClient({
    // Explicitly pass the URL so it overrides any compiled prisma.config.ts value.
    datasources: {
        db: { url: process.env.DATABASE_URL },
    },
    log: process.env.NODE_ENV === 'development'
        ? [{ emit: 'event', level: 'query' }, 'warn', 'error']
        : ['warn', 'error'],
});

if (process.env.NODE_ENV === 'development') {
    prisma.$on('query', (e) => {
        logger.debug(`Prisma Query: ${e.query} | Duration: ${e.duration}ms`);
    });
}

module.exports = prisma;
