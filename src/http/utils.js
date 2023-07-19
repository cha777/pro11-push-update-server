const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const { format } = require('date-fns');

const logger = require('../logger').default;
const { versionInfoFile, prevReleasesFile, assetsDir, serverUploadsDir } = require('./directories');

module.exports = (function () {
  const getVersionInfo = async () => {
    try {
      const data = await fs.promises.readFile(versionInfoFile);
      return JSON.parse(data);
    } catch (err) {
      logger.error(`Error while reading version info file: ${err}`);
      return {};
    }
  };

  const getPrevReleasesInfo = async () => {
    try {
      const data = await fs.promises.readFile(prevReleasesFile);
      return JSON.parse(data);
    } catch (err) {
      logger.error(`Error while reading previous releases info file: ${err}`);
      return { releases: {}, msgType: 2 };
    }
  };

  const deployNewRelease = async (file, versionName) => {
    return new Promise(async (resolve, reject) => {
      let uploadedFilePath;
      let backupDir;

      try {
        const fileVersion = file.originalname.split('.').shift();
        uploadedFilePath = path.resolve(file.path);

        logger.info(`Deploying version ${fileVersion}`);

        backupDir = await _backupReleaseData(fileVersion);
        const { version, installer, releaseNote } = await _getReleaseData(uploadedFilePath, fileVersion);

        await Promise.all([
          await _updateVersionInfo(version, installer),
          await _updatePrevReleases(version, versionName, releaseNote),
        ]);

        resolve();
      } catch (err) {
        logger.error('Error while deploying new release', err);
        reject(err);
      } finally {
        if (backupDir && fs.existsSync(backupDir)) {
          await fs.promises.rm(backupDir, { recursive: true, force: true });
          logger.info('Backup folder removed');
        }

        if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
          await fs.promises.unlink(uploadedFilePath);
          logger.info('Uploaded file removed');
        }
      }
    });
  };
  const _backupReleaseData = function (version) {
    return new Promise(async (resolve, reject) => {
      let backupDir;

      try {
        backupDir = path.resolve(assetsDir, '../backups', format(new Date(), 'yyyyMMddHHmmss'));
        const versionDir = path.join(assetsDir, version);

        if (fs.existsSync(backupDir)) {
          fs.rmdirSync(backupDir, { recursive: true, force: true });
        } else {
          fs.mkdirSync(backupDir, { recursive: true });
        }

        const fileCopyPromises = [];

        if (fs.existsSync(versionInfoFile)) {
          fileCopyPromises.push(
            fs.promises.copyFile(versionInfoFile, path.join(backupDir, path.basename(versionInfoFile)))
          );
        }

        if (fs.existsSync(prevReleasesFile)) {
          fileCopyPromises.push(
            fs.promises.copyFile(prevReleasesFile, path.join(backupDir, path.basename(prevReleasesFile)))
          );
        }

        if (fs.existsSync(versionDir)) {
          fileCopyPromises.push(fs.promises.rename(versionDir, path.resolve(backupDir, version)));
        }

        await Promise.all(fileCopyPromises);

        logger.info(`Release data backup available at ${backupDir}`);
        resolve(backupDir);
      } catch (err) {
        if (fs.existsSync(backupDir)) {
          logger.info('Removing backup directory');
          fs.rmdirSync(backupDir, { recursive: true, force: true });
        }

        logger.error(`Error while making release data backup: ${err}`);
        reject();
      }
    });
  };

  const _updateVersionInfo = async (app, installer) => {
    return new Promise(async (resolve, reject) => {
      try {
        const versionInfo = await getVersionInfo();

        if (app) {
          versionInfo.app = app;
        }

        if (installer) {
          versionInfo.installer = installer;
        }

        await fs.promises.writeFile(versionInfoFile, JSON.stringify(versionInfo, null, 2));
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  };

  const _updatePrevReleases = async (version, versionName, releaseNote) => {
    return new Promise(async (resolve, reject) => {
      try {
        const prevReleases = await getPrevReleasesInfo();

        const newReleaseInfo = Object.assign(releaseNote, {
          version,
          versionName,
          createdDate: format(new Date(), 'yyyyMMdd'),
        });

        const isNewVersionValid = _validateVersionInfo(releaseNote, newReleaseInfo);

        if (isNewVersionValid) {
          prevReleases[version] = newReleaseInfo;

          await fs.promises.writeFile(prevReleasesFile, JSON.stringify(prevReleases, null, 2));
          resolve();
        } else {
          reject(new Error('Invalid release version'));
        }
      } catch (err) {
        reject(err);
      }
    });
  };

  const _getReleaseData = (zipPath, version) => {
    return new Promise(async (resolve, reject) => {
      let versionDir;

      try {
        const parentZip = new AdmZip(zipPath);
        const validEntries = [],
          invalidEntries = [];

        parentZip.getEntries().forEach((entry) => {
          if (path.extname(entry.entryName) === '.zip' && entry.entryName.startsWith(`${version}/${version}_`)) {
            validEntries.push(entry);
          } else {
            invalidEntries.push(entry);
          }
        });

        if (validEntries.length === 0 || invalidEntries.length > 0) {
          reject('Invalid zip file');
          return;
        }

        parentZip.extractAllTo(path.resolve(serverUploadsDir), true);

        versionDir = path.resolve(serverUploadsDir, version);

        const releaseZipPath = path.resolve(serverUploadsDir, validEntries[0].entryName);
        const releaseZip = new AdmZip(releaseZipPath);
        const versionInfoData = JSON.parse(releaseZip.getEntry(`${version}/versionInfo.json`).getData());
        const releaseNoteData = JSON.parse(releaseZip.getEntry(`${version}/releaseNote.json`).getData());

        await fs.promises.rename(
          path.resolve(serverUploadsDir, version),
          path.resolve(assetsDir, versionInfoData.app.toString())
        );

        resolve({
          version: versionInfoData.app,
          installer: versionInfoData.installer,
          releaseNote: releaseNoteData.releases[version],
        });
      } catch (err) {
        reject(err);
      } finally {
        if (versionDir && fs.existsSync(versionDir)) {
          await fs.promises.rm(backupDir, { recursive: true, force: true });
          logger.info('Removed extracted folder');
        }
      }
    });
  };

  const _validateVersionInfo = (releaseNote, newReleaseInfo) => {
    const releaseNoteKeys = Object.keys(releaseNote);
    const isValidReleaseNoteKeysAvailable =
      releaseNoteKeys.includes('EN') && (releaseNoteKeys.includes('AR') || releaseNoteKeys.includes('FR'));

    return (
      isValidReleaseNoteKeysAvailable &&
      newReleaseInfo.version &&
      newReleaseInfo.versionName &&
      newReleaseInfo.createdDate
    );
  };

  return {
    getVersionInfo,
    getPrevReleasesInfo,
    deployNewRelease,
  };
})();
