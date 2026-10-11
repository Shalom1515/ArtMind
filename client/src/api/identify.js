import { post } from './client.js';

export function identify(file) {
  const form = new FormData();
  form.append('image', file);
  return post('/identify', form);
}
