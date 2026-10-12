import { get } from './client.js';

export const search = ({ q, exclude = [], sort, page, limit } = {}) => get('/search', { q, exclude, sort, page, limit });
export const suggest = (q, { limit, signal } = {}) => get('/search/suggest', { q, limit }, { signal });
