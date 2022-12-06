const fs = require('fs');
const path = require('path');

const logger = require('../logger').default;
const {
  versionInfoFile,
  prevReleasesFile,
  assetsDir,
} = require('./directories');

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

  const backupReleaseData = function () {
    return new Promise(async (resolve, reject) => {
      try {
        const backupDir = path.join(
          assetsDir,
          'backups',
          format(new Date(), 'yyyyMMddHHmmss')
        );

        if (fs.existsSync(backupDir)) {
          fs.rmdirSync(backupDir, { recursive: true, force: true });
        } else {
          fs.mkdirSync(backupDir, { recursive: true });
        }

        const fileCopyPromises = [];

        if (fs.existsSync(versionInfoFile)) {
          fileCopyPromises.push(
            fs.promises.copyFile(
              versionInfoFile,
              path.join(backupDir, path.basename(versionInfoFile))
            )
          );
        }

        if (fs.existsSync(prevReleasesFile)) {
          fileCopyPromises.push(
            fs.promises.copyFile(
              prevReleasesFile,
              path.join(backupDir, path.basename(prevReleasesFile))
            )
          );
        }

        await Promise.all(fileCopyPromises);

        logger.info(`Release data backup available at ${backupDir}`);
        resolve(backupDir);
      } catch (err) {
        logger.error(`Error while making release data backup: ${err}`);
        reject();
      }
    });
  };

  const updateVersionInfo = async (app, installer) => {
    return new Promise(async (resolve, reject) => {
      try {
        const versionInfo = await getVersionInfo();

        if (app) {
          versionInfo.app = app;
        }

        if (installer) {
          versionInfo.installer = installer;
        }

        await fs.promises.writeFile(
          versionInfoFile,
          JSON.stringify(versionInfo, null, 2)
        );
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  };

  const updatePrevReleases = async (version, versionName, releaseNote) => {
    return new Promise(async (resolve, reject) => {
      try {
        const prevReleases = await getPrevReleasesInfo();

        const newReleaseInfo = Object.assign(releaseNote, {
          version,
          versionName,
          createdDate: format(new Date(), 'yyyyMMdd'),
        });

        const isNewVersionValid = _validateVersionInfo(
          releaseNote,
          newReleaseInfo
        );

        if (isNewVersionValid) {
          prevReleases[version] = newReleaseInfo;

          await fs.promises.writeFile(
            prevReleasesPath,
            JSON.stringify(prevReleases, null, 2)
          );
          resolve();
        } else {
          reject(new Error('Invalid release version'));
        }
      } catch (err) {
        reject(err);
      }
    });
  };

  const _validateVersionInfo = (releaseNote, newReleaseInfo) => {
    const releaseNoteKeys = Object.keys(releaseNote);
    const isValidReleaseNoteKeysAvailable =
      releaseNoteKeys.includes('EN') &&
      (releaseNoteKeys.includes('AR') || releaseNoteKeys.includes('FR'));

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
    backupReleaseData,
    updateVersionInfo,
    updatePrevReleases,
  };
})();
