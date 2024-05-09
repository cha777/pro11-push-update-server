const express = require('express');
const multer = require('multer');
const { subMonths } = require('date-fns');
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');
const { errorReportsDir } = require('../directories');

const logger = require('../../logger').default;

const router = express.Router();

const fileSize = process.env.REPORT_FILE_SIZE ? parseInt(process.env.REPORT_FILE_SIZE, 10) : 30 * 1024 * 1024; // 100mb

const _cleanUpErrorReportData = async () => {
  try {
    logger.info('Running job to remove old error reports');

    const files = await fs.readdir(errorReportsDir);
    const oneMonthAgo = subMonths(new Date(), 1);

    for (const file of files) {
      const filePath = path.join(errorReportsDir, file);
      const stats = await fs.stat(filePath);
      const fileModifiedTime = stats.mtime;

      if (fileModifiedTime <= oneMonthAgo) {
        await fs.unlink(filePath);
        logger.warn(`Removed ${filePath}`);
      }
    }

    logger.info('Old error reports clean up job completed');
  } catch (err) {
    logger.error(`Error while executing error reports clean up: ${err.message}`);
  }
};

// Schedule the job to run daily
const job = cron.schedule('0 0 * * *', () => {
  _cleanUpErrorReportData();
});

logger.info('Initializing error report remove cron job');
job.start();

const emailTransporter = nodemailer.createTransport({
  host: process.env.REPORT_EMAIL_HOST,
  port: parseInt(process.env.REPORT_EMAIL_PORT, 10),
  secure: false,
  auth: {
    user: process.env.REPORT_EMAIL_USER,
    pass: process.env.REPORT_EMAIL_PASSWORD,
  },
});

const sendReportSubmitNotification = async (req, file) => {
  try {
    await emailTransporter.sendMail({
      from: process.env.REPORT_EMAIL_FROM,
      to: process.env.REPORT_EMAIL_TO,
      subject: process.env.REPORT_EMAIL_SUBJECT,
      text: `
Dear Support Team,

An error report has been filed to the server.

User: ${req.body.username}
Attachment: ${file.filename}

`,
    });
  } catch (err) {
    logger.error('Error while sending error report submit notification email');
  }
};

const upload = multer({
  storage: multer.diskStorage({
    destination: errorReportsDir,
    filename: (req, file, callback) => {
      try {
        const { username } = req.body;
        const ext = path.extname(file.originalname);
        let fileName = Date.now() + ext;

        if (username) {
          fileName = `${username}_${fileName}`;
        }

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
      await sendReportSubmitNotification(req, file);
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
