import { get } from './client.js';

export const listCollections = () => get('/collections');
export const getCollection = (slug) => get(`/collections/${encodeURIComponent(slug)}`);
