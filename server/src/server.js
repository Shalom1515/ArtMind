import { createApp } from './app.js';
import { config } from './config/env.js';
import { connectDb } from './config/db.js';

const app = createApp();

app.listen(config.port, () => {
  console.log(`[server] ArtMind API on http://localhost:${config.port} (${config.env})`);
});

connectDb();
