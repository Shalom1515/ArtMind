import { Router } from 'express';
import { notBuilt } from '../middleware/errors.js';

const router = Router();

router.get('/', notBuilt);
router.get('/:slug', notBuilt);

export default router;
