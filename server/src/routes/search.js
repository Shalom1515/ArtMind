import { Router } from 'express';
import { runSearch, suggestPaintings } from '../controllers/searchController.js';
import { searchLimiter, suggestLimiter } from '../middleware/limits.js';
import { validate } from '../middleware/validate.js';
import { searchQuery, suggestQuery } from '../validators/search.js';

const router = Router();

router.get('/suggest', suggestLimiter, validate({ query: suggestQuery }), suggestPaintings);
router.get('/', searchLimiter, validate({ query: searchQuery }), runSearch);

export default router;
