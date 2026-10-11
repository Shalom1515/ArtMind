import { Router } from 'express';
import { identify } from '../controllers/identifyController.js';
import { identifyLimiter } from '../middleware/limits.js';
import { identifyUpload } from '../middleware/upload.js';

const router = Router();

router.post('/', identifyLimiter, identifyUpload, identify);

export default router;
