import { del, download, get, post } from './client.js';

export const listFavourites = (sort = 'recent') => get('/favourites', { sort });
export const getFavouriteSlugs = () => get('/favourites/ids');
export const addFavourite = (slug) => post('/favourites', { slug });
export const removeFavourite = (slug) => del(`/favourites/${encodeURIComponent(slug)}`);
export const exportFavourites = () => download('/favourites/export', 'artmind_favourites.pdf');
