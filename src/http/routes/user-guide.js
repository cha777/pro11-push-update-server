const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { userGuideDir } = require('../directories');

const router = express.Router();

// Serve static assets (JS, CSS, images, etc.) from the userGuideDir (assets/user-guide)
// Disable directory redirects to prevent Nginx subpath prefix stripping.
router.use('/', express.static(userGuideDir, { redirect: false }));

router.get('/*', async (req, res, next) => {
  // If it's a file with extension (like .js, .css, .png), let static middleware handle it
  if (path.extname(req.path)) {
    return next();
  }

  let filePath = path.join(userGuideDir, req.path);

  // If the path doesn't end with .html, check for index.html first, then .html file
  if (!req.path.endsWith('.html')) {
    const indexPath = path.join(filePath, 'index.html');
    const directPath = filePath.replace(/\/$/, '') + '.html';

    try {
      await fs.access(indexPath);
      filePath = indexPath;
    } catch {
      filePath = directPath;
    }
  }

  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).send('Page not found');
    }
  });
});

module.exports = router;
