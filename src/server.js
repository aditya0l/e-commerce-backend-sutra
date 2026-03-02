require('dotenv').config();
const app = require('./app');
const logger = require('./config/logger');

require('dotenv').config();
const app = require('./app');
const logger = require('./config/logger');
const functions = require('firebase-functions/v2');

// Expose the Express app as a Firebase Cloud Function HTTP Trigger
exports.api = functions.https.onRequest(
  {
    region: 'us-central1', // Set the region
    secrets: [
      "DATABASE_URL",
      "JWT_ACCESS_SECRET",
      "JWT_REFRESH_SECRET"
    ], // Define any Google Cloud Secret Manager secrets here if needed later
    timeoutSeconds: 60, // Cold starts + DB connection pooling may require a longer timeout
  },
  app
);

// Graceful shutdown (Primarily for local emulation)
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
  process.exit(1);
});
