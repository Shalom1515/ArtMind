import { get, post } from './client.js';

export const register = ({ name, email, password, interests, agree }) => post('/auth/register', { name, email, password, interests, agree });
export const verify = ({ email, code }) => post('/auth/verify', { email, code });
export const resendCode = (email) => post('/auth/resend', { email });
export const login = ({ email, password, remember }) => post('/auth/login', { email, password, remember });
export const logout = () => post('/auth/logout');
export const forgot = (email) => post('/auth/forgot', { email });
export const reset = ({ token, password }) => post('/auth/reset', { token, password });
export const me = () => get('/auth/me');
