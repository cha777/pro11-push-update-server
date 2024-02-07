const express = require('express');
const cookieParser = require('cookie-parser');
const axios = require('axios');
const multer = require('multer');
const http = require('http');
const path = require('path');
const fs = require('fs');

const logger = require('../logger').default;
const { assetsDir, clientDir } = require('./directories');

const { allowedUsers, getVersionInfo, getPrevReleasesInfo, deployNewRelease } = require('./utils');

const app = express();
const server = http.createServer(app);

const port = process.env.SERVER_PORT;

if (!port) {
  logger.error('SERVER_PORT is undefined. Please update server port in .env file');
  process.exit(1);
}

server.listen(port, '0.0.0.0', () => {
  logger.info(`Express server listening on port ${port}`);
});

app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

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

app.get('/', (_req, res) => {
  res.status(200).send('File server is working');
});

app.use('/release-uploader', async (req, res, next) => {
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

app.get('/latestVersion', async (_req, res) => {
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
  } catch (e) {
    logger.error(`Error while fetching latest version: ${e.message}`);
    res.status(500);
  }
});

app.get('/prevReleases', async (_req, res) => {
  try {
    const prevReleasesInfo = await getPrevReleasesInfo();

    if (prevReleasesInfo) {
      res.json(prevReleasesInfo);
    } else {
      const msg = 'Previous release notes not found';
      logger.warn(msg);
      res.status(404).send(msg);
    }
  } catch (e) {
    logger.error(`Error while fetching prev releases version: ${e.message}`);
    res.status(500);
  }
});

app.post('/release-uploader/createRelease', async (req, res) => {
  try {
    const jiraSessionKey = 'JSESSIONID';
    const jiraSession = req.cookies[jiraSessionKey];

    if (jiraSession) {
      const session = { name: jiraSessionKey, value: jiraSession };
      const user = await verifyUser(session);

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

app.post('/release-uploader/auth', async (req, res) => {
  const { username, password } = req.body;

  try {
    if (username && password) {
      const session = await loginUser(username, password);
      const user = await verifyUser(session);
      const project = await fetchProjectMeta(session);

      res
        .cookie(session.name, session.value)
        .status(200)
        .send({ ...user, ...project });
    } else {
      res.status(401).send({ error: 'Invalid credentials' });
    }
  } catch (e) {
    logger.error('Error while handling auth request', e.message);
    res.status(500).send({ error: 'Authentication failed' });
  }
});

app.get('/release-uploader/me', async (req, res) => {
  try {
    const jiraSessionKey = 'JSESSIONID';
    const jiraSession = req.cookies[jiraSessionKey];

    if (jiraSession) {
      const session = { name: jiraSessionKey, value: jiraSession };
      const user = await verifyUser(session);
      const project = await fetchProjectMeta(session);

      res.status(200).send({ ...user, ...project });
    } else {
      res.status(401).send();
    }
  } catch (e) {
    logger.error('Error while handling verify request', e.message);
    res.status(500).send();
  }
});

/* Using public as asset folder */
app.use(express.static(assetsDir));
app.use('/release-uploader', express.static(clientDir));

const loginUser = async (username, password) => {
  return (
    await axios({
      url: '/session',
      baseURL: process.env.API_AUTH,
      method: 'post',
      responseType: 'json',
      data: {
        username,
        password,
      },
      validateStatus: function (status) {
        return status >= 200 && status <= 303;
      },
    })
  ).data.session;
};

const verifyUser = async (session) => {
  const user = (
    await axios({
      url: '/myself',
      baseURL: process.env.API_REST,
      method: 'get',
      responseType: 'json',
      validateStatus: function (status) {
        return status >= 200 && status <= 303;
      },
      headers: {
        Cookie: `${session.name}=${session.value};`,
      },
    })
  ).data;

  if (!allowedUsers.includes(user.name)) {
    logger.warn(`User not allowed: ${user.email}`);
    return;
  }

  logger.info(`User verified. username: ${user.name}, displayName: ${user.displayName}`);

  return {
    username: user.name,
    displayName: user.displayName,
    avatarUrl: user.avatarUrls['16x16'],
  };
};

const fetchProjectMeta = async (session) => {
  logger.info(`Fetching projects for ${process.env.PROJECT_NAME}`);

  const { name: projectName, versions } = (
    await axios({
      url: `project/${process.env.PROJECT_NAME}`,
      baseURL: process.env.API_REST,
      method: 'get',
      responseType: 'json',
      validateStatus: function (status) {
        return status >= 200 && status <= 303;
      },
      headers: {
        Cookie: `${session.name}=${session.value};`,
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
