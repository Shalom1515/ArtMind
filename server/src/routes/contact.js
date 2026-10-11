import { Router } from 'express';
import { contact } from '../controllers/meController.js';
import { contactLimiter } from '../middleware/limits.js';
import { validate } from '../middleware/validate.js';
import { contactSchema } from '../validators/me.js';

const router = Router();

router.post('/', contactLimiter, validate({ body: contactSchema }), contact);

export default router;
