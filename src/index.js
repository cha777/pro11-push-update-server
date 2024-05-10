const path = require('path');
const logger = require('./logger').default;
const packageJson = require('../package.json');

logger.info(`File server version: ${packageJson.version}`);
logger.info('Configuring server');

require('dotenv').config({ path: path.resolve('.env') });
require('./http');
