export function passwordProblem(password = '') {
  if (password.length < 8) return 'Use at least eight characters.';
  if (!/[A-Za-z]/.test(password)) return 'Add at least one letter.';
  if (!/\d/.test(password)) return 'Add at least one number.';
  return '';
}

export function passwordStrength(password = '') {
  if (!password) return 0;
  if (passwordProblem(password)) return 1;
  let score = 2;
  const extras = [/[A-Z]/.test(password) && /[a-z]/.test(password), /[^A-Za-z0-9]/.test(password), password.length >= 12];
  if (extras.filter(Boolean).length >= 1) score = 3;
  return score;
}

export const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Strong'];

export function isEmail(value = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}
