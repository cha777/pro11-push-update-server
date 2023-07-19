# Pro11 Push Update Server

## Deployment guide

1. Install required dependencies using one of the following commands. Application is tested using node v16.16.0.
</br>
This will install dependencies for both server and release uploader react app.

   ### npm

   ```sh
   yarn
   ```

   ### yarn

   ```sh
   npm install
   ```

2. Build and package client and server with following command.
</br>
This will create react app production build and bundle server application with pkg

   ### npm

   ```sh
   yarn build
   ```

   ### yarn

   ```sh
   npm run build
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

6. Copy release-uploader react application to `$HOME` directory. This can be accessed using /release-uploader path from the server.
6. Start file server using `pm2` or using `./file-server` command
