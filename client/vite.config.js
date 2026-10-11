import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const server = 'http://localhost:5000';
const dataImages = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../server/data/images');

const imageFolders = {
  '/images/paintings/': path.join(dataImages, 'paintings'),
  '/images/artists/': path.join(dataImages, 'artists'),
};

const contentTypes = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
};

// Serves painting and artist images from the server's data folder in dev,
// so they load even when the API server is not running.
function serverDataImages() {
  return {
    name: 'server-data-images',
    apply: 'serve',
    configureServer(devServer) {
      devServer.middlewares.use((req, res, next) => {
        const urlPath = req.url.split('?')[0];
        const prefix = Object.keys(imageFolders).find((p) => urlPath.startsWith(p));
        if (!prefix) return next();

        const root = imageFolders[prefix];
        let relative;
        try {
          relative = decodeURIComponent(urlPath.slice(prefix.length));
        } catch {
          relative = '';
        }
        const filePath = path.resolve(root, relative);
        const type = contentTypes[path.extname(filePath).toLowerCase()];

        if (!type || !filePath.startsWith(root + path.sep)) {
          res.statusCode = 404;
          return res.end();
        }

        fs.stat(filePath, (err, stats) => {
          if (err || !stats.isFile()) {
            res.statusCode = 404;
            return res.end();
          }
          res.setHeader('Content-Type', type);
          res.setHeader('Content-Length', stats.size);
          res.setHeader('Cache-Control', 'no-cache');
          if (req.method === 'HEAD') return res.end();
          fs.createReadStream(filePath).pipe(res);
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), serverDataImages()],
  server: {
    port: 5173,
    proxy: {
      '/api': server,
      '/uploads': server,
    },
  },
  preview: {
    port: 4173,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{js,jsx}'],
  },
});
