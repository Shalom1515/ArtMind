import { Router } from 'express';
import { forgot, login, logout, me, register, reset, resend, verify } from '../controllers/authController.js';
import { requireDb } from '../middleware/database.js';
import { authLimiter } from '../middleware/limits.js';
import { validate } from '../middleware/validate.js';
import { emailSchema, loginSchema, registerSchema, resetSchema, verifySchema } from '../validators/auth.js';

const router = Router();

router.get('/me', me);
router.post('/logout', logout);

router.use(requireDb, authLimiter);

router.post('/register', validate({ body: registerSchema }), register);
router.post('/verify', validate({ body: verifySchema }), verify);
router.post('/resend', validate({ body: emailSchema }), resend);
router.post('/login', validate({ body: loginSchema }), login);
router.post('/forgot', validate({ body: emailSchema }), forgot);
router.post('/reset', validate({ body: resetSchema }), reset);

export default router;
