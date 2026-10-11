import { Router } from 'express';
import { runSearch } from '../controllers/searchController.js';
import { searchLimiter } from '../middleware/limits.js';
import { validate } from '../middleware/validate.js';
import { searchQuery } from '../validators/search.js';

const router = Router();

router.get('/', searchLimiter, validate({ query: searchQuery }), runSearch);

export default router;
