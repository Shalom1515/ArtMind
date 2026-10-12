import { saveBlob } from '../utils/download.js';

const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
export const USE_MOCK = String(import.meta.env.VITE_USE_MOCK ?? 'false') === 'true';

export class ApiError extends Error {
  constructor(status, message, code, fields) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields || {};
  }
}

let mockModule = null;
async function mock() {
  if (!mockModule) mockModule = await import('./mock/index.js');
  return mockModule;
}

function buildQuery(query) {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, Array.isArray(value) ? value.join(',') : String(value));
  }
  const text = params.toString();
  return text ? `?${text}` : '';
}

async function realRequest(method, path, { body, query, signal, as }) {
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  let response;
  try {
    response = await fetch(`${BASE}/api${path}${buildQuery(query)}`, {
      method,
      credentials: 'include',
      signal,
      headers: body && !isForm ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError(0, 'We could not reach the ArtMind server. Check that it is running and try again.', 'NETWORK');
  }

  if (!response.ok) {
    let payload = null;
    try {
      payload = await response.json();
    } catch {
    }
    const error = payload?.error || {};
    throw new ApiError(response.status, error.message || `The server answered ${response.status}.`, error.code || 'SERVER_ERROR', error.fields);
  }

  if (as === 'blob') return response.blob();
  if (response.status === 204) return null;
  const type = response.headers.get('content-type') || '';
  return type.includes('application/json') ? response.json() : response.text();
}

async function mockRequest(method, path, { body, query, as }) {
  const { handle } = await mock();
  const result = await handle({ method, path, query: query || {}, body });
  if (result.status >= 400) {
    const error = result.data?.error || {};
    throw new ApiError(result.status, error.message, error.code, error.fields);
  }
  if (as === 'blob') return result.data;
  return result.status === 204 ? null : result.data;
}

export async function request(method, path, options = {}) {
  if (!USE_MOCK) return realRequest(method, path, options);
  return mockRequest(method, path, options);
}

export const get = (path, query, options) => request('GET', path, { ...options, query });
export const post = (path, body, options) => request('POST', path, { ...options, body });
export const put = (path, body, options) => request('PUT', path, { ...options, body });
export const patch = (path, body, options) => request('PATCH', path, { ...options, body });
export const del = (path, body, options) => request('DELETE', path, { ...options, body });

export async function download(path, filename, query) {
  const blob = await request('GET', path, { query, as: 'blob' });
  saveBlob(blob, filename);
}

export const getHealth = () => get('/health');
