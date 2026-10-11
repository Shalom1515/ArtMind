import { Router } from 'express';
import { z } from 'zod';
import * as favourites from '../controllers/favouritesController.js';
import { requireUser } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { slugParams } from '../validators/common.js';

const router = Router();

router.use(requireUser);

router.get('/', validate({ query: z.object({ sort: z.enum(['recent', 'title', 'artist']).optional().catch('recent') }) }), favourites.list);
router.get('/ids', favourites.ids);
router.get('/export', favourites.exportPdf);
router.post('/', validate({ body: z.object({ slug: z.string({ error: 'Choose a painting.' }).trim().min(1, 'Choose a painting.').max(160) }) }), favourites.add);
router.delete('/:slug', validate({ params: slugParams }), favourites.remove);

export default router;
