const path = require('path');
const express = require('express');
const http = require('http');
const fs = require('fs');

const { Logger } = require('../logger');

const app = express();
const server = http.createServer(app);
const logger = new Logger();

const port = process.env.SERVER_PORT;

if (!port) {
  logger.error(
    'SERVER_PORT is undefined. Please update server port in .env file'
  );
  process.exit(1);
}

const assetsDir = path.resolve('./assets');
const versionInfoPath = path.resolve(assetsDir, 'versionInfo.json');
const prevReleasesPath = path.resolve(assetsDir, 'prevReleases.json');

logger.info('assetsDir', assetsDir);
logger.info('versionInfoPath', versionInfoPath);
logger.info('prevReleasesPath', prevReleasesPath);

const _getVersionInfo = async () => {
  try {
    const data = await fs.promises.readFile(versionInfoPath);
    return JSON.parse(data);
  } catch (err) {
    logger.error(`Error while reading version info file: ${err}`);
    return {};
  }
};

const _getPrevReleasesInfo = async () => {
  try {
    const data = await fs.promises.readFile(prevReleasesPath);
    return JSON.parse(data);
  } catch (err) {
    logger.error(`Error while reading previous releases info file: ${err}`);
    return { releases: {}, msgType: 2 };
  }
};

server.listen(port, '0.0.0.0', () => {
  logger.info(`Express server listening on port ${port}`);
});

/* Using public as asset folder */
app.use(express.static(assetsDir));
app.use(express.json());

app.get('/', (_req, res) => {
  res.status(200).send('File server is working');
});

app.get('/latestVersion', async (_req, res) => {
  const versionInfo = await _getVersionInfo();
  logger.info('versionInfo', versionInfo);

  if (versionInfo && versionInfo.app && versionInfo.installer) {
    res.json(versionInfo);
  } else {
    const msg = 'Build not found';
    logger.warn(msg);
    res.status(404).send(msg);
  }
});

app.get('/prevReleases', async (_req, res) => {
  const prevReleasesInfo = await _getPrevReleasesInfo();

  if (prevReleasesInfo) {
    res.json(prevReleasesInfo);
  } else {
    const msg = 'Previous release notes not found';
    logger.warn(msg);
    res.status(404).send(msg);
  }
});
