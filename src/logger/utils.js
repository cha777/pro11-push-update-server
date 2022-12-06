const path = require('path');

module.exports = (function () {
  const logFileName = 'server.log';
  const exceptionLogFileName = 'server-exception.log';

  /**
   * Return log directory for the current
   */
  const logDir = (function () {
    return path.join(process.cwd(), 'logs');
  })();

  const currentLogFile = (function () {
    return path.join(logDir, logFileName);
  })();

  const currentExceptionLogFile = (function () {
    return path.join(logDir, exceptionLogFileName);
  })();

  return {
    logDir,
    currentLogFile,
    currentExceptionLogFile,
  };
})();
