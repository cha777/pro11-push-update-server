const express = require('express');

const { getVersionInfo, getPrevReleasesInfo } = require('../utils');
const logger = require('../../logger').default;

const router = express.Router();

router.get('/latestVersion', async (_req, res) => {
  try {
    const versionInfo = await getVersionInfo();
    logger.debug('versionInfo', versionInfo);

    if (versionInfo && versionInfo.app && versionInfo.installer) {
      res.json(versionInfo);
    } else {
      const msg = 'Build not found';
      logger.warn(msg);
      res.status(404).send(msg);
    }
  } catch (err) {
    logger.error(`Error while fetching latest version: ${err}`);
    res.status(500);
  }
});

router.get('/prevReleases', async (_req, res) => {
  try {
    const prevReleasesInfo = await getPrevReleasesInfo();

    if (prevReleasesInfo) {
      res.json(prevReleasesInfo);
    } else {
      const msg = 'Previous release notes not found';
      logger.warn(msg);
      res.status(404).send(msg);
    }
  } catch (err) {
    logger.error(`Error while fetching prev releases version: ${err}`);
    res.status(500);
  }
});

module.exports = router;
