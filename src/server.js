require('dotenv').config();
const app = require('./app');
const logger = require('./config/logger');

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT} [${process.env.NODE_ENV}]`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
  process.exit(1);
});
