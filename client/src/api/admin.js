import { del, get, patch, post, put } from './client.js';

export const getOverview = (days = 30) => get('/admin/overview', { days });

function paintingForm(fields) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null) continue;
    if (key === 'tags' || key === 'palette') form.append(key, JSON.stringify(value));
    else form.append(key, value instanceof Blob ? value : String(value));
  }
  return form;
}

export const listPaintings = ({ q, category, page, limit } = {}) => get('/admin/paintings', { q, category, page, limit });
export const getPainting = (id) => get(`/admin/paintings/${id}`);
export const createPainting = (fields) => post('/admin/paintings', paintingForm(fields));
export const updatePainting = (id, fields) => put(`/admin/paintings/${id}`, paintingForm(fields));
export const deletePainting = (id) => del(`/admin/paintings/${id}`);
export const setFeatured = (id, featured) => patch(`/admin/paintings/${id}/featured`, { featured });

export function generateDetails(fileOrId) {
  if (typeof fileOrId === 'string') return post('/admin/paintings/generate', { id: fileOrId });
  const form = new FormData();
  form.append('image', fileOrId);
  return post('/admin/paintings/generate', form);
}

function artistForm(fields) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null) continue;
    if (key === 'styles') form.append(key, JSON.stringify(value));
    else form.append(key, value instanceof Blob ? value : String(value));
  }
  return form;
}

export const listArtists = (q) => get('/admin/artists', { q });
export const createArtist = (fields) => post('/admin/artists', artistForm(fields));
export const updateArtist = (id, fields) => put(`/admin/artists/${id}`, artistForm(fields));
export const deleteArtist = (id) => del(`/admin/artists/${id}`);

export const listCollections = () => get('/admin/collections');
export const createCollection = (fields) => post('/admin/collections', fields);
export const updateCollection = (id, fields) => put(`/admin/collections/${id}`, fields);
export const deleteCollection = (id) => del(`/admin/collections/${id}`);

export const listUsers = ({ q, page, limit } = {}) => get('/admin/users', { q, page, limit });
export const setRole = (id, role) => patch(`/admin/users/${id}/role`, { role });
export const setActive = (id, active) => patch(`/admin/users/${id}/active`, { active });

export const listMessages = (status) => get('/admin/messages', { status });
export const setMessageStatus = (id, status) => patch(`/admin/messages/${id}`, { status });
