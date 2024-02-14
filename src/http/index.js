const express = require('express');
const cookieParser = require('cookie-parser');
const http = require('http');

const releaseInfo = require('./routes/release-info');
const releaseUploader = require('./routes/release-uploader');
const errorReport = require('./routes/error-report');

const logger = require('../logger').default;
const { assetsDir } = require('./directories');

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

app.get('/', (_req, res) => {
  res.status(200).send('File server is working');
});

app.use('/', releaseInfo);
app.use('/release-uploader', releaseUploader);
app.use('/error-report', errorReport);

/* Using public as asset folder */
app.use(express.static(assetsDir));
