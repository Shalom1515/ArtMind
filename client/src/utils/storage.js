const memory = new Map();

function store() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const key = '__artmind_check';
      window.localStorage.setItem(key, '1');
      window.localStorage.removeItem(key);
      return window.localStorage;
    }
  } catch {
  }
  return null;
}

const ls = store();

export function readJson(key, fallback = null) {
  try {
    const raw = ls ? ls.getItem(key) : memory.get(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeJson(key, value) {
  const raw = JSON.stringify(value);
  try {
    if (ls) ls.setItem(key, raw);
    else memory.set(key, raw);
  } catch {
    memory.set(key, raw);
  }
}

export function removeKey(key) {
  try {
    if (ls) ls.removeItem(key);
  } catch {
  }
  memory.delete(key);
}
