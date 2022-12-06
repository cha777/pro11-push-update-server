# Pro11 Push Update Server

## Deployment guide

1. Install required dependencies using one of the following commands. Application is tested using node v16.16.0

   ### npm

   ```sh
   yarn
   ```

   ### yarn

   ```sh
   npm install
   ```

2. Bundle module with pkg using one of following commands

   ### npm

   ```sh
   yarn bundle
   ```

   ### yarn

   ```sh
   npm run bundle
   ```

3. Copy appropriate pkg output from `dist` folder
4. Copy `.env` and `assets` folder and deploy them inside the same folder with the pkg output
5. Edit `SERVER_PORT` defined in `.env` file as required

Note the final folder structure as below

```
file-server-root
|__ file-server [pkg output]
|__ .env
|__ assets
|    |__ versionInfo.json
|    |__ prevReleases.json
|    |__ [build]
|__ logs
```

6. Start file server using `pm2` or using `./file-server` command
