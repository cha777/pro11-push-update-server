const express = require('express');
const http = require('http');
const fs = require('fs');

const logger = require('../logger').default;
const { assetsDir } = require('./directories');

const {
  getVersionInfo,
  getPrevReleasesInfo,
  backupReleaseData,
  updateVersionInfo,
  updatePrevReleases,
} = require('./utils');

const app = express();
const server = http.createServer(app);

const port = process.env.SERVER_PORT;

if (!port) {
  logger.error(
    'SERVER_PORT is undefined. Please update server port in .env file'
  );
  process.exit(1);
}

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
  const versionInfo = await getVersionInfo();
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
  const prevReleasesInfo = await getPrevReleasesInfo();

  if (prevReleasesInfo) {
    res.json(prevReleasesInfo);
  } else {
    const msg = 'Previous release notes not found';
    logger.warn(msg);
    res.status(404).send(msg);
  }
});

app.post('/createRelease', async (req, res) => {
  let backupDir;

  try {
    const { version, installer, versionName, releaseNote } = req.body;
    logger.info('new version data', req.body);

    logger.info(`Deploying version ${version}`);

    backupDir = await backupReleaseData();

    await Promise.all([
      await updateVersionInfo(version, installer),
      await updatePrevReleases(version, versionName, releaseNote),
    ]);

    logger.info(`Successfully deployed version: ${version}`);
    res.status(200).send(`Successfully deployed version ${version}`);
  } catch (err) {
    logger.error(`Error while creating release: ${err}`);
    res.status(500).send(`Error while deploying version`);
  } finally {
    if (fs.existsSync(backupDir)) {
      fs.rm(backupDir, { recursive: true, force: true });
      logger.info('Backup folder removed');
    }
  }
});
