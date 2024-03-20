const express = require('express');
const multer = require('multer');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

const logger = require('../../logger').default;
const { clientDir } = require('../directories');
const { deployNewRelease, allowedUsers } = require('../utils');

const router = express.Router();

const upload = multer({
  dest: 'uploads/',
  limits: { files: 1, fields: 1, fileSize: 60 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    try {
      if (file.mimetype !== 'application/zip' && file.mimetype !== 'application/x-zip-compressed') {
        cb(new Error('Invalid file type'));
        return;
      }

      const { versionName } = req.body;

      if (!versionName) {
        cb(new Error('Version name unavailable'));
        return;
      }

      const versionNumber = versionName.split('_').pop().split('-').shift().replaceAll('.', '');
      const releaseFileName = file.originalname.split('.').shift().split('_').shift();

      if (releaseFileName.length !== 10 || !releaseFileName.startsWith(versionNumber)) {
        cb(new Error('Invalid file name'));
        return;
      }

      cb(null, true);
    } catch (err) {
      cb(new Error('Cannot accept this file'));
    }
  },
});

router.get('/', async (req, res, next) => {
  if (req.originalUrl.endsWith('index.html') || req.originalUrl.endsWith('/release-uploader/')) {
    try {
      const indexFilePath = path.resolve(clientDir, 'index.html');

      if (fs.existsSync(indexFilePath)) {
        let content = await fs.promises.readFile(path.resolve(clientDir, 'index.html'), { encoding: 'utf-8' });
        content = content.replaceAll('/[BASE_PATH]', process.env.BASE_PATH);

        res.send(content);
      } else {
        logger.warn(`release uploader file not available at ${indexFilePath}`);
        res.status(404);
      }
    } catch (e) {
      res.status(501);
    }
  } else {
    next();
  }
});

router.post('/createRelease', async (req, res) => {
  try {
    const authToken = req.headers.authorization;

    if (authToken) {
      const user = await _verifyUser(authToken);

      if (user) {
        logger.debug(`Release creation - ${user.name}`);

        upload.single('release')(req, res, async (err) => {
          if (err) {
            res.status(400).send({ error: 'Bad Request' });
            return;
          }

          const file = req.file;
          const { versionName } = req.body;

          if (!file) {
            res.status(500).send({ error: 'File not available' });
            return;
          }

          if (!versionName) {
            res.status(500).send({ error: 'Version name not available' });
            return;
          }

          await deployNewRelease(req.file, versionName);

          logger.info(`Successfully deployed version: ${versionName}`);
          res.status(200).send({ message: `Successfully deployed version ${versionName}` });
        });
      } else {
        res.status(401).send({ error: 'Unauthorized' });
      }
    } else {
      res.status(401).send({ error: 'Unauthorized' });
    }
  } catch (e) {
    res.status(500).send({ error: 'Error while deploying version' });
  }
});

router.post('/auth', async (req, res) => {
  const authToken = req.headers.authorization;

  try {
    if (authToken) {
      const user = await _verifyUser(authToken);
      const project = await _fetchProjectMeta(authToken);

      res.status(200).send({ ...user, ...project });
    } else {
      res.status(401).send({ error: 'Invalid credentials' });
    }
  } catch (e) {
    logger.error('Error while handling auth request:', e.message);
    res.status(500).send({ error: 'Authentication failed' });
  }
});

router.get('/me', async (req, res) => {
  try {
    const authToken = req.headers.authorization;

    if (authToken) {
      const user = await _verifyUser(authToken);
      const project = await _fetchProjectMeta(authToken);

      res.status(200).send({ ...user, ...project });
    } else {
      res.status(401).send();
    }
  } catch (e) {
    logger.error('Error while handling verify request', e.message);
    res.status(500).send();
  }
});

router.use('/', express.static(clientDir));

const _verifyUser = async (authToken) => {
  const user = (
    await axios({
      url: '/myself',
      baseURL: process.env.API_REST,
      method: 'get',
      headers: {
        Authorization: authToken,
      },
      responseType: 'json',
      validateStatus: function (status) {
        return status >= 200 && status <= 303;
      },
    })
  ).data;

  if (!allowedUsers.includes(user.emailAddress)) {
    logger.warn(`User not allowed: ${user.emailAddress}`);
    return;
  }

  logger.info(`User verified. username: ${user.emailAddress}, displayName: ${user.displayName}`);

  return {
    username: user.emailAddress,
    displayName: user.displayName,
    avatarUrl: user.avatarUrls['16x16'],
  };
};

const _fetchProjectMeta = async (authToken) => {
  logger.info(`Fetching projects for ${process.env.PROJECT_NAME}`);

  const { name: projectName, versions } = (
    await axios({
      url: `project/${process.env.PROJECT_NAME}`,
      baseURL: process.env.API_REST,
      method: 'get',
      headers: {
        Authorization: authToken,
      },
      responseType: 'json',
      validateStatus: function (status) {
        return status >= 200 && status <= 303;
      },
    })
  ).data;

  const unreleasedVersions = [];

  versions.forEach((version) => {
    if (!version.released && version.name.startsWith(process.env.PROJECT_RELEASE_PREFIX)) {
      unreleasedVersions.push({ id: version.id, name: version.name });
    }
  });

  return { projectName, versions: unreleasedVersions.reverse() };
};

module.exports = router;
