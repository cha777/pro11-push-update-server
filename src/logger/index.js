const winston = require('winston');

const utils = require('./utils');

class Logger {
  constructor() {
    this._createLogger();
  }

  _createLogger() {
    const customFormat = winston.format.printf(({ level, message, timestamp }) => {
      return [timestamp, `[${level.toUpperCase()}]`, `${message}`].join(' ');
    });

    const logger = winston.createLogger({
      level: 'silly',
      format: winston.format.combine(winston.format.timestamp(), winston.format.align(), customFormat),
      transports: [
        new winston.transports.File({
          level: 'info',
          filename: utils.currentLogFile,
          maxsize: 10 * 1024 * 1024,
          maxFiles: 5,
          colorize: false,
          json: false,
          tailable: true,
          zippedArchive: true,
        }),
      ],
      exceptionHandlers: [
        new winston.transports.File({
          filename: utils.currentExceptionLogFile,
        }),
      ],
    });

    if (process.env.NODE_ENV !== 'production') {
      logger.add(new winston.transports.Console(), {
        level: 'debug',
      });
    }

    this.logger = logger;
  }
}

const { logger } = new Logger();
exports.default = logger;
