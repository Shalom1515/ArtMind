import { get, post } from './client.js';

export const sendContact = ({ name, email, subject, message }) => post('/contact', { name, email, subject, message });
export const getFaq = () => get('/faq');
