const path = require('path');
const logger = require('./logger').default;

logger.info('Configuring server');

require('dotenv').config({ path: path.resolve('.env') });
require('./http');
