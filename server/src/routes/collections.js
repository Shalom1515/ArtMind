import { Router } from 'express';
import { collection, collections } from '../controllers/catalogueController.js';
import { validate } from '../middleware/validate.js';
import { slugParams } from '../validators/common.js';

const router = Router();

router.get('/', collections);
router.get('/:slug', validate({ params: slugParams }), collection);

export default router;
