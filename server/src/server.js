import { mkdirSync } from 'node:fs';
import app from './app.js';
import { config } from './config/env.js';
import { connectDb } from './config/db.js';
import { storage } from './config/storage.js';
import { logMailStatus } from './services/mail/index.js';
import { loadModel } from './services/recognition/index.js';

mkdirSync(storage.avatars, { recursive: true });

await connectDb();
logMailStatus();

loadModel().catch((err) => console.warn(`[recognition] ${err.message}`));

app.listen(config.port, () => {
  console.log(`[server] ArtMind API on http://localhost:${config.port} (${config.env})`);
});
