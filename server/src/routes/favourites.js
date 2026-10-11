import { Router } from 'express';
import { requireUser } from '../middleware/auth.js';
import { notBuilt } from '../middleware/errors.js';

const router = Router();

router.use(requireUser);

router.get('/', notBuilt);
router.get('/ids', notBuilt);
router.get('/export', notBuilt);
router.post('/', notBuilt);
router.delete('/:slug', notBuilt);

export default router;
