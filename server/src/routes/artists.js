import { Router } from 'express';
import { artist, artists } from '../controllers/catalogueController.js';
import { validate } from '../middleware/validate.js';
import { artistsQuery } from '../validators/catalogue.js';
import { slugParams } from '../validators/common.js';

const router = Router();

router.get('/', validate({ query: artistsQuery }), artists);
router.get('/:slug', validate({ params: slugParams }), artist);

export default router;
