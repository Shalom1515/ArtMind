import { Router } from 'express';
import { forgot, login, logout, me, register, reset, resend, verify } from '../controllers/authController.js';
import { requireDb } from '../middleware/database.js';
import { authLimiter } from '../middleware/limits.js';

const router = Router();

router.get('/me', (req, res, next) => (req.user ? me(req, res, next) : res.json({ user: null })));
router.post('/logout', logout);

router.use(requireDb);

router.post('/register', authLimiter, register);
router.post('/verify', authLimiter, verify);
router.post('/resend', authLimiter, resend);
router.post('/login', authLimiter, login);
router.post('/forgot', authLimiter, forgot);
router.post('/reset', authLimiter, reset);

export default router;
