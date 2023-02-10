const path = require('path');

const logger = require('../logger').default;

module.exports = (function () {
  const assetsDir = (function () {
    const assetsDir = path.resolve('./assets');
    logger.info('assetsDir', assetsDir);

    return assetsDir;
  })();

  const versionInfoFile = (function () {
    const versionInfoFile = path.resolve(assetsDir, 'versionInfo.json');
    logger.info('versionInfoFile', versionInfoFile);

    return versionInfoFile;
  })();

  const prevReleasesFile = (function () {
    const prevReleasesFile = path.resolve(assetsDir, 'prevReleases.json');
    logger.info('prevReleasesFile', prevReleasesFile);

    return prevReleasesFile;
  })();

  const serverUploadsDir = (function () {
    const uploadsDir = path.resolve('./uploads');
    logger.info('serverUploadsDir', uploadsDir);

    return uploadsDir;
  })();

  return {
    assetsDir,
    versionInfoFile,
    prevReleasesFile,
    serverUploadsDir,
  };
})();
