import { Router } from 'express';
import { faq } from '../controllers/catalogueController.js';

const router = Router();

router.get('/', faq);

export default router;
