const express = require('express');
const multer = require('multer');
const path = require('path');
const { errorReportsDir } = require('../directories');

const logger = require('../../logger').default;

let router = express.Router();

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

      logger.info(`Successfully uploaded error report: ${file}`);
      res.status(200).send(file);
    });
  } catch (err) {
    logger.error(`Error while processing error report file: ${err.message}`);
    res.status(500).send({ error: 'Error while submitting error report' });
  }
});

router.get('/', (_req, res) => {
  res.status(200).send('Error report service is working');
});

module.exports = router;
