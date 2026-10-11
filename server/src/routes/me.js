import { Router } from 'express';
import * as me from '../controllers/meController.js';
import { requireUser } from '../middleware/auth.js';
import { avatarUpload } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import { deleteAccountSchema, detailsSchema, interestsSchema, passwordSchema } from '../validators/me.js';

const router = Router();

router.use(requireUser);

router.patch('/', validate({ body: detailsSchema }), me.updateDetails);
router.delete('/', validate({ body: deleteAccountSchema }), me.deleteAccount);
router.post('/photo', avatarUpload, me.uploadPhoto);
router.put('/interests', validate({ body: interestsSchema }), me.updateInterests);
router.put('/password', validate({ body: passwordSchema }), me.changePassword);
router.delete('/sessions', me.signOutOthers);
router.get('/export', me.exportData);
router.get('/insights', me.getInsights);
router.post('/insights/taste', me.newTaste);

export default router;
