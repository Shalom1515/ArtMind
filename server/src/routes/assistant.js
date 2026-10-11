import { Router } from 'express';
import { requireUser } from '../middleware/auth.js';
import { notBuilt } from '../middleware/errors.js';
import { assistantLimiter } from '../middleware/limits.js';

const router = Router();

router.get('/suggestions', notBuilt);
router.post('/messages', assistantLimiter, notBuilt);
router.get('/conversations', requireUser, notBuilt);
router.get('/conversations/:id', requireUser, notBuilt);
router.delete('/conversations/:id', requireUser, notBuilt);

export default router;
