import { Router } from 'express';
import * as catalogue from '../controllers/catalogueController.js';
import { downloadPainting } from '../controllers/documentsController.js';
import { validate } from '../middleware/validate.js';
import { downloadQuery, limitQuery, paintingsQuery } from '../validators/catalogue.js';
import { slugParams } from '../validators/common.js';

const router = Router();

router.get('/', validate({ query: paintingsQuery }), catalogue.listPaintings);
router.get('/trending', validate({ query: limitQuery }), catalogue.trending);
router.get('/:slug', validate({ params: slugParams }), catalogue.painting);
router.get('/:slug/similar', validate({ params: slugParams, query: limitQuery }), catalogue.similar);
router.get('/:slug/moreByArtist', validate({ params: slugParams, query: limitQuery }), catalogue.moreByArtist);
router.post('/:slug/view', validate({ params: slugParams }), catalogue.recordView);
router.get('/:slug/download', validate({ params: slugParams, query: downloadQuery }), downloadPainting);

export default router;
