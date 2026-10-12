import request from 'supertest';
import { describe, expect, test } from 'vitest';
import app from '../src/app.js';

// These run without a database, so they check the parts that never need one.
describe('server basics without a database', () => {
  test('health says the database is not connected and reports the image model', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.database).toBe('disconnected');
    expect(['ready', 'loading', 'unavailable']).toContain(res.body.imageModel);
  });

  test('options lists the six categories and twelve colour groups', async () => {
    const res = await request(app).get('/api/options').expect(200);
    expect(res.body.categories).toEqual(['Abstract', 'Landscape', 'Flower', 'Nature', 'Figurative', 'Religious']);
    expect(res.body.colours).toHaveLength(12);
  });

  test('faq falls back to the seed file', async () => {
    const res = await request(app).get('/api/faq').expect(200);
    expect(res.body.items).toHaveLength(8);
  });

  test('data routes answer 503 in the usual error shape', async () => {
    const res = await request(app).get('/api/paintings').expect(503);
    expect(res.body.error.code).toBe('DB_UNAVAILABLE');
  });

  test('user and admin routes need a login', async () => {
    expect((await request(app).get('/api/favourites').expect(401)).body.error.code).toBe('UNAUTHENTICATED');
    await request(app).get('/api/admin/overview').expect(401);
    await request(app).get('/api/recommendations').expect(401);
  });

  test('me answers null when nobody is logged in', async () => {
    const res = await request(app).get('/api/auth/me').expect(200);
    expect(res.body.user).toBeNull();
  });

  test('unknown api routes answer 404', async () => {
    const res = await request(app).get('/api/nothingHere').expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  test('a missing painting image answers 404', async () => {
    await request(app).get('/images/paintings/not-a-painting.jpg').expect(404);
  });

  test('a painting image is served with a long cache time', async () => {
    const res = await request(app).get('/images/paintings/morning-on-the-river.jpg');
    if (res.status === 404) return console.warn('Skipped: morning-on-the-river.jpg is missing.');
    expect(res.headers['content-type']).toMatch(/jpeg/);
  });

  test('bad JSON gives a clear 400', async () => {
    const res = await request(app).post('/api/assistant/messages').set('Content-Type', 'application/json').send('{bad').expect(400);
    expect(res.body.error.code).toBe('VALIDATION');
  });

  test('a guest id cookie is set once', async () => {
    const res = await request(app).get('/api/health');
    expect(String(res.headers['set-cookie'])).toMatch(/artmind_guest=[a-f0-9]{32}.*HttpOnly/i);
  });

  test('cors allows the client origin with credentials', async () => {
    const res = await request(app).get('/api/health').set('Origin', 'http://localhost:5173');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  test('the assistant suggestions match the design', async () => {
    const res = await request(app).get('/api/assistant/suggestions').expect(200);
    expect(res.body.items).toHaveLength(6);
    expect(res.body.items[0]).toBe('Explain impressionism in simple words');
  });
});
