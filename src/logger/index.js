const winston = require('winston');
const { format } = require('date-fns');

require('winston-logrotate');

const utils = require('./utils');

class Logger {
  constructor() {
    this._createLogger();
  }

  info(...message) {
    this.logger.info(...message);
  }

  warn(...message) {
    this.logger.warn(this._extend(...message));
  }

  error(...message) {
    this.logger.error(this._extend(...message));
  }

  _createLogger() {
    const rotateTransport = new winston.transports.Rotate({
      file: utils.currentLogFile,
      colorize: false,
      timestamp: () => {
        return this._getFormattedTimeStamp();
      },
      json: false,
      size: '10m',
      keep: 5,
      compress: true,
    });

    const logger = new winston.Logger({
      transports: [rotateTransport],
    });

    winston.handleExceptions(
      new winston.transports.File({
        filename: utils.currentExceptionLogFile,
      })
    );

    if (process.env.NODE_ENV !== 'production') {
      logger.add(winston.transports.Console, {
        level: 'debug',
      });
    }

    this.logger = logger;
  }

  _extend(message) {
    return message;
  }

  _getFormattedTimeStamp() {
    return format(new Date(), 'yyyy-MM-dd HH:mm:ss.SSSxxx');
  }
}

const logger = new Logger();
exports.default = logger;
