import { Router } from 'express';
import { isDbConnected } from '../config/db.js';
import { modelStatus } from '../services/recognition/index.js';

const router = Router();

router.get('/', (req, res) => {
  const model = modelStatus();
  res.json({
    status: 'ok',
    database: isDbConnected() ? 'connected' : 'disconnected',
    imageModel: model === 'ready' ? 'ready' : model === 'failed' ? 'unavailable' : 'loading',
  });
});

export default router;
