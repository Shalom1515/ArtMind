import { Router } from 'express';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config/env.js';

const router = Router();

router.get('/', async (req, res) => {
  const items = JSON.parse(await readFile(path.join(config.paths.seed, 'faq.json'), 'utf8'));
  res.json({ items });
});

export default router;
