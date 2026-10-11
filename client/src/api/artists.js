import { get } from './client.js';

export const listArtists = ({ q, letter } = {}) => get('/artists', { q, letter });
export const getArtist = (slug) => get(`/artists/${encodeURIComponent(slug)}`);
