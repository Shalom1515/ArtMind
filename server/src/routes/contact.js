import { Router } from 'express';
import { notBuilt } from '../middleware/errors.js';
import { contactLimiter } from '../middleware/limits.js';

const router = Router();

router.post('/', contactLimiter, notBuilt);

export default router;
