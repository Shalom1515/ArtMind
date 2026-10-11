import { download, get, post } from './client.js';

export const getOptions = () => get('/options');
export const getHome = () => get('/home');
export const getCategories = () => get('/categories');

export const listPaintings = (filters = {}) => get('/paintings', filters);
export const getTrending = (limit = 6) => get('/paintings/trending', { limit });
export const getPainting = (slug) => get(`/paintings/${encodeURIComponent(slug)}`);
export const getSimilar = (slug, limit = 4) => get(`/paintings/${encodeURIComponent(slug)}/similar`, { limit });
export const getMoreByArtist = (slug, limit = 4) => get(`/paintings/${encodeURIComponent(slug)}/moreByArtist`, { limit });
export const recordView = (slug) => post(`/paintings/${encodeURIComponent(slug)}/view`);

export const downloadPainting = (slug, format = 'pdf') =>
  download(`/paintings/${encodeURIComponent(slug)}/download`, `${slug}.${format}`, { format });
