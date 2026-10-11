// Drops keys such as $gt or a.b so nobody can slip a Mongo operator into a query.
function clean(value) {
  if (Array.isArray(value)) return value.map(clean);
  if (!value || typeof value !== 'object' || Buffer.isBuffer(value)) return value;
  const out = {};
  for (const [key, inner] of Object.entries(value)) {
    if (key.startsWith('$') || key.includes('.')) continue;
    out[key] = clean(inner);
  }
  return out;
}

export function setQuery(req, value) {
  Object.defineProperty(req, 'query', { value, writable: true, configurable: true, enumerable: true });
}

export function sanitize(req, res, next) {
  if (req.body && typeof req.body === 'object') req.body = clean(req.body);
  setQuery(req, clean({ ...req.query }));
  next();
}
