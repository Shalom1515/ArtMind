import { existsSync } from 'node:fs';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/env.js';
import { defaultFolders, storage } from './config/storage.js';
import { loadUser } from './middleware/auth.js';
import { apiNotFound, errorHandler } from './middleware/errors.js';
import { guestId } from './middleware/guest.js';
import { sanitize } from './middleware/sanitize.js';
import api from './routes/index.js';

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: (origin, done) => done(null, !origin || config.clientUrls.includes(origin.replace(/\/$/, ''))),
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
if (config.isDev) app.use(morgan('dev'));
app.use(sanitize);

const staticOptions = { maxAge: config.isTest ? 0 : '30d', index: false };
const staticCache = new Map();

// Looks up the folder on every request, so tests can point uploads at a temporary folder.
function serveFrom(getFolders) {
  return (req, res, next) => {
    const folders = [...new Set(getFolders())];
    const run = (i) => {
      if (i >= folders.length) return next();
      if (!staticCache.has(folders[i])) staticCache.set(folders[i], express.static(folders[i], staticOptions));
      staticCache.get(folders[i])(req, res, () => run(i + 1));
    };
    run(0);
  };
}

function missingFile(req, res) {
  res.status(404).json({ error: { message: 'That file does not exist.', code: 'NOT_FOUND' } });
}

app.use('/images/paintings', serveFrom(() => [storage.paintings, defaultFolders.paintings]), missingFile);
app.use('/images/artists', serveFrom(() => [storage.artists, defaultFolders.artists]), missingFile);
app.use('/uploads', serveFrom(() => [storage.uploads]), missingFile);

app.use('/api', guestId, loadUser, api);
app.use('/api', apiNotFound);

if (config.isProduction && existsSync(config.paths.clientDist)) {
  app.use(express.static(config.paths.clientDist, { index: false, maxAge: '1h' }));
  app.get('/{*any}', (req, res) => res.sendFile(path.join(config.paths.clientDist, 'index.html')));
}

app.use(errorHandler);

export default app;
