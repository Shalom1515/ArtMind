import { Router } from 'express';
import { requireAdmin } from '../middleware/auth.js';
import { notBuilt } from '../middleware/errors.js';
import { artistPhotoUpload, paintingUpload } from '../middleware/upload.js';

const router = Router();

router.use(requireAdmin);

router.get('/overview', notBuilt);

router.get('/paintings', notBuilt);
router.post('/paintings/generate', paintingUpload, notBuilt);
router.get('/paintings/:id', notBuilt);
router.post('/paintings', paintingUpload, notBuilt);
router.put('/paintings/:id', paintingUpload, notBuilt);
router.delete('/paintings/:id', notBuilt);
router.patch('/paintings/:id/featured', notBuilt);

router.get('/artists', notBuilt);
router.post('/artists', artistPhotoUpload, notBuilt);
router.put('/artists/:id', artistPhotoUpload, notBuilt);
router.delete('/artists/:id', notBuilt);

router.get('/collections', notBuilt);
router.post('/collections', notBuilt);
router.put('/collections/:id', notBuilt);
router.delete('/collections/:id', notBuilt);

router.get('/users', notBuilt);
router.patch('/users/:id/role', notBuilt);
router.patch('/users/:id/active', notBuilt);

router.get('/messages', notBuilt);
router.patch('/messages/:id', notBuilt);

export default router;
