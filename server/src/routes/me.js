import { Router } from 'express';
import { requireUser } from '../middleware/auth.js';
import { notBuilt } from '../middleware/errors.js';
import { avatarUpload } from '../middleware/upload.js';

const router = Router();

router.use(requireUser);

router.patch('/', notBuilt);
router.delete('/', notBuilt);
router.post('/photo', avatarUpload, notBuilt);
router.put('/interests', notBuilt);
router.put('/password', notBuilt);
router.delete('/sessions', notBuilt);
router.get('/export', notBuilt);
router.get('/insights', notBuilt);
router.post('/insights/taste', notBuilt);

export default router;
