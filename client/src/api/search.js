import { get } from './client.js';

export const search = ({ q, exclude = [], sort, page, limit } = {}) => get('/search', { q, exclude, sort, page, limit });
