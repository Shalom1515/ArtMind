import { Router } from 'express';
import * as assistant from '../controllers/assistantController.js';
import { requireUser } from '../middleware/auth.js';
import { requireDb } from '../middleware/database.js';
import { assistantLimiter } from '../middleware/limits.js';
import { validate } from '../middleware/validate.js';
import { messageSchema } from '../validators/assistant.js';
import { idParams } from '../validators/common.js';

const router = Router();

router.get('/suggestions', assistant.suggestions);
router.post('/messages', requireDb, assistantLimiter, validate({ body: messageSchema }), assistant.sendMessage);
router.get('/conversations', requireUser, assistant.listConversations);
router.get('/conversations/:id', requireUser, validate({ params: idParams }), assistant.getConversation);
router.delete('/conversations/:id', requireUser, validate({ params: idParams }), assistant.deleteConversation);

export default router;
