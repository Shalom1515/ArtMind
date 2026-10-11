import { Router } from 'express';
import { notBuilt } from '../middleware/errors.js';
import { uploadLimiter } from '../middleware/limits.js';
import { identifyUpload } from '../middleware/upload.js';

const router = Router();

router.post('/', uploadLimiter, identifyUpload, notBuilt);

export default router;
