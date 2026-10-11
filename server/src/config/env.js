import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const here = path.dirname(fileURLToPath(import.meta.url));
export const serverRoot = path.resolve(here, '..', '..');
export const projectRoot = path.resolve(serverRoot, '..');

dotenv.config({ path: path.join(serverRoot, '.env'), quiet: true });

const env = process.env;
const nodeEnv = env.NODE_ENV || 'development';

const clientUrls = String(env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((url) => url.trim().replace(/\/$/, ''))
  .filter(Boolean);

export const config = {
  env: nodeEnv,
  isDev: nodeEnv === 'development',
  isTest: nodeEnv === 'test',
  isProduction: nodeEnv === 'production',
  port: Number(env.PORT) || 5000,
  mongoUri: env.MONGODB_URI || '',
  jwtSecret: env.JWT_SECRET || 'artmind_dev_only_secret',
  clientUrls,
  clientUrl: clientUrls[0] || 'http://localhost:5173',
  mail: {
    resendKey: env.RESEND_API_KEY || '',
    from: env.MAIL_FROM || '',
  },
  assistant: {
    url: (env.ASSISTANT_API_URL || '').replace(/\/$/, ''),
    key: env.ASSISTANT_API_KEY || '',
    model: env.ASSISTANT_MODEL || '',
  },
  paths: {
    root: serverRoot,
    project: projectRoot,
    data: path.join(serverRoot, 'data'),
    seed: path.join(serverRoot, 'data', 'seed'),
    models: path.join(serverRoot, 'data', 'models'),
    clientDist: path.join(projectRoot, 'client', 'dist'),
    brand: path.join(projectRoot, 'client', 'public', 'brand'),
  },
};

export const modelIsSet = () => Boolean(config.assistant.url && config.assistant.key && config.assistant.model);

if (!env.JWT_SECRET && !config.isTest) {
  console.warn('[config] JWT_SECRET is not set. Using a development secret. Set it in server/.env before going live.');
}
