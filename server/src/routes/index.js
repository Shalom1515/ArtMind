import { Router } from 'express';
import { requireDb } from '../middleware/database.js';
import admin from './admin.js';
import artists from './artists.js';
import assistant from './assistant.js';
import auth from './auth.js';
import categories from './categories.js';
import collections from './collections.js';
import contact from './contact.js';
import faq from './faq.js';
import favourites from './favourites.js';
import health from './health.js';
import home from './home.js';
import identify from './identify.js';
import me from './me.js';
import options from './options.js';
import paintings from './paintings.js';
import recommendations from './recommendations.js';
import search from './search.js';

const api = Router();

api.use('/health', health);
api.use('/options', options);
api.use('/faq', faq);
api.use('/auth', auth);
api.use('/me', me);
api.use('/favourites', favourites);
api.use('/recommendations', recommendations);
api.use('/admin', admin);
api.use('/assistant', assistant);

api.use('/home', requireDb, home);
api.use('/categories', requireDb, categories);
api.use('/paintings', requireDb, paintings);
api.use('/artists', requireDb, artists);
api.use('/collections', requireDb, collections);
api.use('/search', requireDb, search);
api.use('/identify', requireDb, identify);
api.use('/contact', requireDb, contact);

export default api;
