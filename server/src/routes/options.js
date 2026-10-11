import { Router } from 'express';
import { options } from '../controllers/catalogueController.js';

const router = Router();

router.get('/', options);

export default router;
