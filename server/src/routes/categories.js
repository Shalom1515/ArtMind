import { Router } from 'express';
import { categories } from '../controllers/catalogueController.js';

const router = Router();

router.get('/', categories);

export default router;
