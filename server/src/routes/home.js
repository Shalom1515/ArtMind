import { Router } from 'express';
import { home } from '../controllers/catalogueController.js';

const router = Router();

router.get('/', home);

export default router;
