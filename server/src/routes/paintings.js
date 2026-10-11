import { Router } from 'express';
import { notBuilt } from '../middleware/errors.js';

const router = Router();

router.get('/', notBuilt);
router.get('/trending', notBuilt);
router.get('/:slug', notBuilt);
router.get('/:slug/similar', notBuilt);
router.get('/:slug/moreByArtist', notBuilt);
router.post('/:slug/view', notBuilt);
router.get('/:slug/download', notBuilt);

export default router;
