import { Router } from 'express';
import { CATEGORIES, COLOUR_GROUPS, MEDIUMS, MOODS, STYLES, SURFACES } from '../config/constants.js';

const router = Router();

router.get('/', (req, res) => {
  res.json({ categories: CATEGORIES, styles: STYLES, mediums: MEDIUMS, surfaces: SURFACES, moods: MOODS, colours: COLOUR_GROUPS });
});

export default router;
