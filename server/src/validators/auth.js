import { CATEGORIES } from '../config/constants.js';
import { ApiError } from '../utils/ApiError.js';

export const isEmail = (value = '') => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value).trim());

export function passwordProblem(password = '') {
  if (String(password).length < 8) return 'Use at least eight characters.';
  if (!/[A-Za-z]/.test(password)) return 'Add at least one letter.';
  if (!/\d/.test(password)) return 'Add at least one number.';
  return '';
}

function check(fields) {
  const errors = Object.fromEntries(Object.entries(fields).filter(([, message]) => message));
  if (Object.keys(errors).length) throw ApiError.badRequest(undefined, errors);
}

export function validateRegister(body = {}) {
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const interests = Array.isArray(body.interests) ? [...new Set(body.interests.filter((c) => CATEGORIES.includes(c)))] : [];
  check({
    name: name.length < 2 || name.length > 60 ? 'Enter your full name.' : '',
    email: isEmail(email) ? '' : 'Enter a valid email address.',
    password: passwordProblem(body.password),
    interests: interests.length === 3 ? '' : 'Pick three categories.',
    agree: body.agree === true ? '' : 'Please agree to the terms to continue.',
  });
  return { name, email, password: String(body.password), interests };
}

export function validateEmail(body = {}) {
  const email = String(body.email || '').trim().toLowerCase();
  check({ email: isEmail(email) ? '' : 'Enter a valid email address.' });
  return email;
}

export function validateVerify(body = {}) {
  const email = validateEmail(body);
  const code = String(body.code || '').trim();
  check({ code: /^\d{6}$/.test(code) ? '' : 'Enter the six digit code.' });
  return { email, code };
}

export function validateLogin(body = {}) {
  const email = String(body.email || '').trim().toLowerCase();
  check({
    email: email ? '' : 'Enter your email address.',
    password: body.password ? '' : 'Enter your password.',
  });
  return { email, password: String(body.password), remember: body.remember === true };
}

export function validateReset(body = {}) {
  const token = String(body.token || '').trim();
  check({ token: token ? '' : 'This reset link is not complete.', password: passwordProblem(body.password) });
  return { token, password: String(body.password) };
}
