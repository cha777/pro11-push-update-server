const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');

(async () => {
  const rootDir = path.resolve(__dirname, '../');
  const packageJsonFilePath = path.resolve(rootDir, 'package.json');
  const filesToCopy = ['README.md', '.env-sample'];

  const {
    name,
    pkg: { targets, outputPath },
  } = JSON.parse(await fs.promises.readFile(packageJsonFilePath));

  targets.forEach((target) => {
    const [, platform, arch] = target.split('-');
    const zipFileName = `${name}-${platform}-${arch}.zip`;
    let srcPath = path.resolve(outputPath, `${name}-${platform}`);

    if (platform === 'win') {
      srcPath += '.exe';
    }

    const zip = new AdmZip();
    zip.addLocalFile(srcPath, '', 'file-server');

    filesToCopy.forEach((file) => {
      zip.addLocalFile(path.resolve(rootDir, file));
    });

    zip.writeZip(path.resolve(outputPath, zipFileName));
  });

  const webAppFolderPath = path.resolve(outputPath, 'release-uploader');

  if (fs.existsSync(webAppFolderPath)) {
    const zip = new AdmZip();
    zip.addLocalFolder(webAppFolderPath);
    zip.writeZip(path.resolve(outputPath, 'release-uploader.zip'));
  }
})();
