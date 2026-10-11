import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/env.js';
import { loadUser } from './middleware/auth.js';
import { apiNotFound, errorHandler } from './middleware/errors.js';
import api from './routes/index.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: config.clientUrl, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));
  app.use(cookieParser());
  if (config.isDev) app.use(morgan('dev'));

  mkdirSync(config.paths.uploads, { recursive: true });
  const staticOptions = { maxAge: config.isDev ? 0 : '7d', fallthrough: false };
  app.use('/images/paintings', express.static(config.paths.paintingImages, staticOptions));
  app.use('/images/artists', express.static(config.paths.artistImages, staticOptions));
  app.use('/uploads', express.static(config.paths.uploads, staticOptions));

  app.use('/api', loadUser, api);
  app.use('/api', apiNotFound);

  const clientDist = path.resolve(config.paths.root, '..', 'client', 'dist');
  if (!config.isDev && existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('/{*any}', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
  }

  app.use(errorHandler);
  return app;
}
