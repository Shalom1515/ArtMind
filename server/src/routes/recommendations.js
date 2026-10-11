import { Router } from 'express';
import { recommendations } from '../controllers/meController.js';
import { requireUser } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { limitQuery } from '../validators/catalogue.js';

const router = Router();

router.get('/', requireUser, validate({ query: limitQuery }), recommendations);

export default router;
