const LOCALE = 'en-GB';

export function formatDate(value, options = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!value) return '';
  return new Intl.DateTimeFormat(LOCALE, options).format(new Date(value));
}

export function formatLongDate(value = new Date()) {
  return new Intl.DateTimeFormat(LOCALE, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    .format(new Date(value))
    .replace(',', '');
}

export function formatMonthYear(value) {
  return formatDate(value, { month: 'long', year: 'numeric' });
}

export function formatNumber(value) {
  return new Intl.NumberFormat(LOCALE).format(Number(value) || 0);
}

export function timeAgo(value, now = Date.now()) {
  if (!value) return '';
  const seconds = Math.round((now - new Date(value).getTime()) / 1000);
  if (seconds < 45) return 'Just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  return formatDate(value);
}

export function greeting(date = new Date()) {
  const hour = new Date(date).getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function formatSize(painting) {
  if (!painting?.widthCm || !painting?.heightCm) return '';
  return `${painting.widthCm} × ${painting.heightCm} cm`;
}

export function caption(painting) {
  if (!painting) return '';
  return [painting.title, painting.artist?.name, painting.year].filter(Boolean).join(', ');
}

export function firstName(name = '') {
  return name.trim().split(/\s+/)[0] || '';
}

export function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export function plural(count, word, many = `${word}s`) {
  return `${formatNumber(count)} ${count === 1 ? word : many}`;
}
