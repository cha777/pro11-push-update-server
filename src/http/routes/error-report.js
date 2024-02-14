const express = require('express');
const multer = require('multer');
const path = require('path');
const { errorReportsDir } = require('../directories');

const logger = require('../../logger').default;

const router = express.Router();

const fileSize = process.env.REPORT_FILE_SIZE || 100 * 1024 * 1024; // 100mb

const upload = multer({
  storage: multer.diskStorage({
    destination: errorReportsDir,
    filename: (_req, file, callback) => {
      try {
        let ext = path.extname(file.originalname);
        let fileName = Date.now() + ext;

        callback(null, fileName);
      } catch (err) {
        logger.error(`Error while generating error report file name: ${err.message}`);
        callback(err);
      }
    },
  }),
  limits: { files: 1, fields: 1, fileSize },
  fileFilter: (_req, file, callback) => {
    try {
      if (file.mimetype !== 'application/zip' && file.mimetype !== 'application/x-zip-compressed') {
        logger.error(`Unacceptable file type: ${file.mimetype}`);
        callback(new Error('Invalid file type'));
        return;
      }

      callback(null, true);
    } catch (err) {
      logger.error(`Error while filtering upload file type: ${err.message}`);
      callback(new Error('Cannot accept this file'));
    }
  },
});

router.post('/submit', (req, res) => {
  try {
    upload.single('filename')(req, res, async (err) => {
      if (err) {
        logger.error(`Error while saving error report file: ${err.message}`);
        res.status(400).send({ error: 'Bad Request' });
        return;
      }

      const file = req.file;

      if (!file) {
        logger.error('Error report file name not available');
        res.status(500).send({ error: 'File not available' });
        return;
      }

      logger.info(`Successfully uploaded error report: ${file.filename}`);
      res.status(200).send(file);
    });
  } catch (err) {
    logger.error(`Error while processing error report file: ${err.message}`);
    res.status(500).send({ error: 'Error while submitting error report' });
  }
});

router.get('/:fileName', (req, res) => {
  try {
    const fileName = req.params.fileName;

    logger.info(`Sending ${fileName} error report`);

    res.sendFile(fileName, { root: errorReportsDir }, (err) => {
      if (err) {
        logger.error(`Sending error report file ${fileName} failed ${err.message}`);
        return;
      }

      logger.info(`Successfully sent error report file ${fileName}`);
    });
  } catch (err) {
    logger.error(`Error sending error report file: ${err.message}`);
    res.status(500).send({ error: 'Error downloading error report' });
  }
});

router.get('/', (_req, res) => {
  res.status(200).send('Error report service is working');
});

module.exports = router;
