import { Router } from 'express';
import { isDbConnected } from '../config/db.js';

const router = Router();

router.get('/', (req, res) => {
  res.json({ status: 'ok', database: isDbConnected() ? 'connected' : 'disconnected' });
});

export default router;
