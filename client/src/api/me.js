import { del, download, get, patch, post, put } from './client.js';

export const updateDetails = (fields) => patch('/me', fields);

export function uploadPhoto(file) {
  const form = new FormData();
  form.append('photo', file);
  return post('/me/photo', form);
}

export const updateInterests = (interests, styles) => put('/me/interests', { interests, styles });
export const changePassword = ({ currentPassword, newPassword }) => put('/me/password', { currentPassword, newPassword });
export const signOutOtherDevices = () => del('/me/sessions');
export const downloadMyData = () => download('/me/export', 'artmind_my_data.json');
export const deleteAccount = (password) => del('/me', { password });

export const getInsights = () => get('/me/insights');
export const refreshTaste = () => post('/me/insights/taste');
export const getRecommendations = (limit = 8) => get('/recommendations', { limit });
