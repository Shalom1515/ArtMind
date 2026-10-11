import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = '';

let app;

before(async () => {
  const { createApp } = await import('../src/app.js');
  app = createApp();
});

after(async () => {
  const mongoose = (await import('mongoose')).default;
  await mongoose.disconnect();
});

describe('server foundations', () => {
  test('health answers ok and says the database is not connected', async () => {
    const res = await request(app).get('/api/health').expect(200);
    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.database, 'disconnected');
  });

  test('options lists the six categories and twelve colour groups', async () => {
    const res = await request(app).get('/api/options').expect(200);
    assert.deepEqual(res.body.categories, ['Abstract', 'Landscape', 'Flower', 'Nature', 'Figurative', 'Religious']);
    assert.equal(res.body.colours.length, 12);
  });

  test('faq has eight questions', async () => {
    const res = await request(app).get('/api/faq').expect(200);
    assert.equal(res.body.items.length, 8);
  });

  test('routes that are not built yet answer 501', async () => {
    const res = await request(app).get('/api/paintings').expect(501);
    assert.equal(res.body.error.code, 'NOT_BUILT');
  });

  test('user routes need a login', async () => {
    const res = await request(app).get('/api/favourites').expect(401);
    assert.equal(res.body.error.code, 'UNAUTHENTICATED');
  });

  test('admin routes need a login', async () => {
    await request(app).get('/api/admin/overview').expect(401);
  });

  test('unknown api routes answer 404 in the usual error shape', async () => {
    const res = await request(app).get('/api/nothingHere').expect(404);
    assert.equal(res.body.error.code, 'NOT_FOUND');
  });

  test('a missing painting image answers 404', async () => {
    await request(app).get('/images/paintings/not-a-painting.jpg').expect(404);
  });

  test('bad JSON gives a clear 400', async () => {
    const res = await request(app).post('/api/contact').set('Content-Type', 'application/json').send('{bad').expect(400);
    assert.equal(res.body.error.code, 'VALIDATION');
  });
});
