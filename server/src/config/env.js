import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const here = path.dirname(fileURLToPath(import.meta.url));
export const serverRoot = path.resolve(here, '..', '..');

dotenv.config({ path: path.join(serverRoot, '.env'), quiet: true });

const env = process.env;

export const config = {
  env: env.NODE_ENV || 'development',
  isDev: (env.NODE_ENV || 'development') === 'development',
  isTest: env.NODE_ENV === 'test',
  port: Number(env.PORT) || 5000,
  mongoUri: env.MONGODB_URI || '',
  jwtSecret: env.JWT_SECRET || 'artmind_dev_only_secret',
  clientUrl: env.CLIENT_URL || 'http://localhost:5173',
  mail: {
    resendKey: env.RESEND_API_KEY || '',
    from: env.MAIL_FROM || '',
  },
  assistant: {
    url: env.ASSISTANT_API_URL || '',
    key: env.ASSISTANT_API_KEY || '',
    model: env.ASSISTANT_MODEL || '',
  },
  paths: {
    root: serverRoot,
    data: path.join(serverRoot, 'data'),
    seed: path.join(serverRoot, 'data', 'seed'),
    paintingImages: path.join(serverRoot, 'data', 'images', 'paintings'),
    artistImages: path.join(serverRoot, 'data', 'images', 'artists'),
    uploads: path.join(serverRoot, 'uploads'),
  },
};

if (!env.JWT_SECRET && !config.isTest) {
  console.warn('[config] JWT_SECRET is not set. Using a development secret. Set it in server/.env before going live.');
}
