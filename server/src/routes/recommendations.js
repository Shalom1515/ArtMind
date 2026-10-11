import { Router } from 'express';
import { requireUser } from '../middleware/auth.js';
import { notBuilt } from '../middleware/errors.js';

const router = Router();

router.get('/', requireUser, notBuilt);

export default router;
