import { Router } from 'express';
import { z } from 'zod';
import * as admin from '../controllers/adminController.js';
import { requireAdmin } from '../middleware/auth.js';
import { requireDb } from '../middleware/database.js';
import { artistPhotoUpload, paintingUpload } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import {
  activeSchema, adminPaintingsQuery, featuredSchema, generateSchema, messagesQuery, messageStatusSchema, overviewQuery, roleSchema, usersQuery,
} from '../validators/admin.js';
import { idParams } from '../validators/common.js';

const router = Router();
const byId = validate({ params: idParams });

router.use(requireAdmin, requireDb);

router.get('/overview', validate({ query: overviewQuery }), admin.overview);

router.get('/paintings', validate({ query: adminPaintingsQuery }), admin.listPaintings);
router.post('/paintings/generate', paintingUpload, validate({ body: generateSchema }), admin.generate);
router.get('/paintings/:id', byId, admin.getPainting);
router.post('/paintings', paintingUpload, admin.createPainting);
router.put('/paintings/:id', byId, paintingUpload, admin.updatePainting);
router.delete('/paintings/:id', byId, admin.deletePainting);
router.patch('/paintings/:id/featured', byId, validate({ body: featuredSchema }), admin.setFeatured);

router.get('/artists', validate({ query: z.object({ q: z.string().trim().max(80).optional() }) }), admin.listArtists);
router.post('/artists', artistPhotoUpload, admin.createArtist);
router.put('/artists/:id', byId, artistPhotoUpload, admin.updateArtist);
router.delete('/artists/:id', byId, admin.deleteArtist);

router.get('/collections', admin.listCollections);
router.post('/collections', admin.createCollection);
router.put('/collections/:id', byId, admin.updateCollection);
router.delete('/collections/:id', byId, admin.deleteCollection);

router.get('/users', validate({ query: usersQuery }), admin.listUsers);
router.patch('/users/:id/role', byId, validate({ body: roleSchema }), admin.setRole);
router.patch('/users/:id/active', byId, validate({ body: activeSchema }), admin.setActive);

router.get('/messages', validate({ query: messagesQuery }), admin.listMessages);
router.patch('/messages/:id', byId, validate({ body: messageStatusSchema }), admin.setMessageStatus);

export default router;
