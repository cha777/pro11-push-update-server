const path = require('path');
const logger = require('./logger').default;
const packageJson = require('../package.json');

logger.info(`File server version: ${packageJson.version}`);
logger.info('Configuring server');

process.on('unhandledRejection', (reason, p) => {
  logger.error(`Global Error Handler - ${reason}: Unhandled Rejection at Promise' ${p}`);
});

process.on('uncaughtException', (reason) => {
  logger.error(reason.stack);
});

require('dotenv').config({ path: path.resolve('.env') });
require('./http');
