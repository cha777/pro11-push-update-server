const fs = require('fs');
const path = require('path');
const { apps } = require('./ecosystem.config');

const fileServerFile = path.resolve(__dirname, 'file-server');

if (!fs.existsSync(fileServerFile)) {
  console.error(`File server not found at ${fileServerFile} location`);
  return;
}

apps.forEach(async ({ name }) => {
  const serverDir = path.resolve(__dirname, name);

  if (!fs.existsSync(serverDir)) {
    console.error(`${serverDir} not found`);
    return;
  }

  const serverLogs = path.resolve(serverDir, 'logs', 'server.log');

  try {
    console.log(`Copying files to ${name}`);
    await Promise.all([fs.promises.copyFile(fileServerFile, serverDir), fs.promises.writeFile(serverLogs, '')]);
    console.log(`Copied files to ${name} successfully`);
  } catch (e) {
    console.error(`Error while updating files in ${name}`);
  }
});
