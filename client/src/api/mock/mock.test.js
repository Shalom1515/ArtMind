import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, test } from 'vitest';
import { handle, resetMockData, setMockDelay, syncSession } from './index.js';
import { db } from './db.js';

setMockDelay(0);

const call = (method, path, body, query) => handle({ method, path, body, query });
const login = (email = 'ada@artmind.test') => {
  const user = db().users.find((u) => u.email === email);
  syncSession('/auth/login', { user: { ...user, password: undefined } });
};

beforeEach(() => {
  resetMockData();
});

describe('mock adapter', () => {
  test('every endpoint in docs/api.md has a mock route', async () => {
    const doc = readFileSync(new URL('../../../../docs/api.md', import.meta.url), 'utf8');
    const found = [...doc.matchAll(/`(GET|POST|PUT|PATCH|DELETE) \/api(\/[^`\s]*)`/g)].map((m) => [m[1], m[2]]);
    expect(found.length).toBeGreaterThan(50);
    for (const [method, path] of found.filter(([, p]) => !p.startsWith('/auth/'))) {
      const concrete = path.replace(':slug', 'koi-pond').replace(':id', 'x1');
      const res = await call(method, concrete, {});
      expect(res.data?.error?.message || '', `${method} ${path}`).not.toMatch(/There is no API route/);
    }
  });

  test('the mock follows the server session', async () => {
    syncSession('/auth/verify', { user: { id: 'srv1', name: 'New Person', email: 'new@example.com', role: 'user', verified: true, interests: ['Abstract'] } });
    expect((await call('GET', '/favourites/ids')).status).toBe(200);
    syncSession('/auth/logout', null);
    expect((await call('GET', '/favourites/ids')).status).toBe(401);
  });

  test('gallery filters, counts and pages', async () => {
    const res = await call('GET', '/paintings', undefined, { category: 'Landscape', limit: 4 });
    expect(res.data.total).toBe(10);
    expect(res.data.items).toHaveLength(4);
    expect(res.data.pages).toBe(3);
    expect(res.data.counts.category.Abstract).toBe(10);
    expect(res.data.counts.medium.Oil).toBeGreaterThan(0);
  });

  test('search understands calm landscapes', async () => {
    const res = await call('GET', '/search', undefined, { q: 'calm landscapes' });
    expect(res.data.understood.map((c) => c.label)).toEqual(['Category: Landscape', 'Mood: Calm']);
    expect(res.data.total).toBe(8);
    const wider = await call('GET', '/search', undefined, { q: 'calm landscapes', exclude: 'mood:Calm' });
    expect(wider.data.total).toBe(10);
  });

  test('favourites need a login and then toggle', async () => {
    expect((await call('POST', '/favourites', { slug: 'koi-pond' })).status).toBe(401);
    login();
    const before = (await call('GET', '/favourites/ids')).data.slugs.length;
    await call('POST', '/favourites', { slug: 'the-drummer' });
    expect((await call('GET', '/favourites/ids')).data.slugs).toContain('the-drummer');
    await call('DELETE', '/favourites/the-drummer');
    expect((await call('GET', '/favourites/ids')).data.slugs).toHaveLength(before);
  });

  test('admin routes are for admins only', async () => {
    login();
    expect((await call('GET', '/admin/overview')).status).toBe(403);
    login('admin@artmind.test');
    const res = await call('GET', '/admin/overview', undefined, { days: 30 });
    expect(res.data.totals.paintings).toBe(60);
    expect(res.data.viewsPerDay).toHaveLength(30);
  });

  test('the assistant answers and suggests paintings', async () => {
    const res = await call('POST', '/assistant/messages', { message: 'Show me calm landscapes with soft light' });
    expect(res.data.reply.paintings.length).toBeGreaterThan(0);
    expect(res.data.conversationId).toBeNull();
    const explain = await call('POST', '/assistant/messages', { message: 'What is gold leaf?' });
    expect(explain.data.reply.text).toMatch(/gold/i);
  });

  test('downloads come back as files', async () => {
    const pdf = await call('GET', '/paintings/koi-pond/download', undefined, { format: 'pdf' });
    expect(pdf.data.type).toBe('application/pdf');
    const docx = await call('GET', '/paintings/koi-pond/download', undefined, { format: 'docx' });
    expect(docx.data.size).toBeGreaterThan(500);
  });
});
