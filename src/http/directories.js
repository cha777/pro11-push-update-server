const path = require('node:path');

const logger = require('../logger').default;

module.exports = (function () {
  const assetsDir = (function () {
    const assetsDir = path.resolve('./assets');
    logger.info(`assetsDir: ${assetsDir}`);

    return assetsDir;
  })();

  const versionInfoFile = (function () {
    const versionInfoFile = path.resolve(assetsDir, 'versionInfo.json');
    logger.info(`versionInfoFile: ${versionInfoFile}`);

    return versionInfoFile;
  })();

  const prevReleasesFile = (function () {
    const prevReleasesFile = path.resolve(assetsDir, 'prevReleases.json');
    logger.info(`prevReleasesFile: ${prevReleasesFile}`);

    return prevReleasesFile;
  })();

  const serverUploadsDir = (function () {
    const uploadsDir = path.resolve('./uploads');
    logger.info(`serverUploadsDir: ${uploadsDir}`);

    return uploadsDir;
  })();

  const clientDir = (function () {
    const clientDir = path.resolve(process.env.HOME, 'release-uploader');
    logger.info(`clientDir: ${clientDir}`);

    return clientDir;
  })();

  const errorReportsDir = (function () {
    const errorReportsDir = path.resolve('./error-reports');
    logger.info(`errorReportsDir: ${errorReportsDir}`);

    return errorReportsDir;
  })();

  return {
    assetsDir,
    versionInfoFile,
    prevReleasesFile,
    serverUploadsDir,
    clientDir,
    errorReportsDir,
  };
})();
