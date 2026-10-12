import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import app from '../src/app.js';
import { defaultFolders, storage } from '../src/config/storage.js';
import { Artist, Collection, ContactMessage, Favourite, Painting, Session, User } from '../src/models/index.js';
import { loginAs, PASSWORDS, startTestDb } from './helpers.js';

let db;
let ada;
let admin;
let shippedBefore;

const binary = (res, done) => {
  const chunks = [];
  res.on('data', (c) => chunks.push(c));
  res.on('end', () => done(null, Buffer.concat(chunks)));
};

const jpeg = (width = 320, height = 240, colour = '#A33A2C') => sharp({ create: { width, height, channels: 3, background: colour } }).jpeg().toBuffer();

beforeAll(async () => {
  shippedBefore = readdirSync(defaultFolders.paintings).length;
  db = await startTestDb({ seed: true });
  ada = await loginAs(app, 'user');
  admin = await loginAs(app, 'admin');
});

afterAll(async () => {
  await db.stop();
  expect(readdirSync(defaultFolders.paintings).length).toBe(shippedBefore);
});

describe('favourites', () => {
  test('list, sort and count', async () => {
    const res = await ada.get('/api/favourites').expect(200);
    expect(res.body.total).toBe(6);
    expect(res.body.items[0].painting.slug).toBe('morning-on-the-river');
    const byTitle = await ada.get('/api/favourites').query({ sort: 'title' }).expect(200);
    const titles = byTitle.body.items.map((i) => i.painting.title);
    expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b)));
    const ids = await ada.get('/api/favourites/ids').expect(200);
    expect(ids.body.slugs).toHaveLength(6);
  });

  test('add and remove are both safe to repeat', async () => {
    const first = await ada.post('/api/favourites').send({ slug: 'the-drummer' }).expect(201);
    const again = await ada.post('/api/favourites').send({ slug: 'the-drummer' }).expect(201);
    expect(again.body).toEqual(first.body);
    expect(first.body.count).toBe(7);
    expect((await ada.delete('/api/favourites/the-drummer').expect(200)).body).toEqual({ slug: 'the-drummer', count: 6 });
    expect((await ada.delete('/api/favourites/the-drummer').expect(200)).body.count).toBe(6);
    await ada.post('/api/favourites').send({ slug: 'not-a-painting' }).expect(404);
  });

  test('painting details say saved for the owner', async () => {
    expect((await ada.get('/api/paintings/koi-pond')).body.painting.saved).toBe(true);
    expect((await request(app).get('/api/paintings/koi-pond')).body.painting.saved).toBe(false);
  });
});

describe('documents', () => {
  test('painting details as PDF with the right headers', async () => {
    const res = await request(app).get('/api/paintings/morning-on-the-river/download').query({ format: 'pdf' }).buffer(true).parse(binary).expect(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toBe('attachment; filename="morning-on-the-river.pdf"');
    expect(res.body.subarray(0, 4).toString()).toBe('%PDF');
  });

  test('painting details as Word with the right headers', async () => {
    const res = await request(app).get('/api/paintings/morning-on-the-river/download').query({ format: 'docx' }).buffer(true).parse(binary).expect(200);
    expect(res.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    expect(res.headers['content-disposition']).toBe('attachment; filename="morning-on-the-river.docx"');
    expect(res.body.subarray(0, 2).toString()).toBe('PK');
  });

  test('favourites export is a PDF for the logged in user only', async () => {
    await request(app).get('/api/favourites/export').expect(401);
    const res = await ada.get('/api/favourites/export').buffer(true).parse(binary).expect(200);
    expect(res.headers['content-disposition']).toBe('attachment; filename="artmind_favourites.pdf"');
    expect(res.body.subarray(0, 4).toString()).toBe('%PDF');
  });
});

describe('profile', () => {
  test('details, bio limit and interests', async () => {
    const res = await ada.patch('/api/me').send({ bio: 'Loves rivers.', country: 'Ghana' }).expect(200);
    expect(res.body.user).toMatchObject({ bio: 'Loves rivers.', country: 'Ghana', email: 'ada@artmind.test' });
    const long = await ada.patch('/api/me').send({ bio: 'x'.repeat(301) }).expect(400);
    expect(long.body.error.fields.bio).toBe('Keep your bio under 300 characters.');
    const interests = await ada.put('/api/me/interests').send({ interests: ['Abstract', 'Religious'] }).expect(200);
    expect(interests.body.user.interests).toEqual(['Abstract', 'Religious']);
    await ada.put('/api/me/interests').send({ interests: [] }).expect(400);
  });

  test('avatar upload is resized to 400 by 400, saved in the temporary folder, and the old one removed', async () => {
    const first = await ada.post('/api/me/photo').attach('photo', await jpeg(900, 600), 'me.jpg').expect(200);
    const firstFile = path.join(storage.avatars, path.basename(first.body.user.avatar));
    expect(firstFile.startsWith(db.tempRoot)).toBe(true);
    expect(await sharp(firstFile).metadata()).toMatchObject({ width: 400, height: 400 });
    const second = await ada.post('/api/me/photo').attach('photo', await jpeg(500, 500, '#3A7C8C'), 'me2.jpg').expect(200);
    expect(existsSync(firstFile)).toBe(false);
    await ada.get(second.body.user.avatar).expect(200);
  });

  test('a photo over 2 MB answers 413', async () => {
    const big = Buffer.concat([await jpeg(), Buffer.alloc(2 * 1024 * 1024)]);
    const res = await ada.post('/api/me/photo').attach('photo', big, 'big.jpg').expect(413);
    expect(res.body.error.code).toBe('TOO_LARGE');
  });

  test('download my data as JSON', async () => {
    const res = await ada.get('/api/me/export').buffer(true).parse(binary).expect(200);
    expect(res.headers['content-disposition']).toBe('attachment; filename="artmind_my_data.json"');
    const data = JSON.parse(res.body.toString());
    expect(data.profile.email).toBe('ada@artmind.test');
    expect(data.favourites).toHaveLength(6);
    expect(data.conversations).toHaveLength(3);
  });

  test('delete account removes everything linked and ends all sessions', async () => {
    const user = await User.findOne({ email: 'chinedu.okeke@example.com' });
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ email: user.email, password: PASSWORDS.user }).expect(200);
    await agent.delete('/api/me').send({ password: 'Wrong1234' }).expect(400);
    await agent.delete('/api/me').send({ password: PASSWORDS.user }).expect(204);
    expect(await User.exists({ _id: user._id })).toBeNull();
    expect(await Favourite.countDocuments({ user: user._id })).toBe(0);
    expect(await Session.countDocuments({ user: user._id })).toBe(0);
  });

  test('the last admin cannot delete themselves', async () => {
    const res = await admin.delete('/api/me').send({ password: PASSWORDS.admin }).expect(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });
});

describe('admin', () => {
  test('every admin route needs the admin role', async () => {
    for (const [method, url] of [['get', '/api/admin/overview'], ['get', '/api/admin/paintings'], ['get', '/api/admin/users'], ['get', '/api/admin/messages'], ['post', '/api/admin/collections']]) {
      expect((await request(app)[method](url)).status).toBe(401);
      const res = await ada[method](url);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    }
  });

  test('overview for 30 days in Lagos time', async () => {
    const res = await admin.get('/api/admin/overview').query({ days: 30 }).expect(200);
    expect(res.body.totals).toMatchObject({ paintings: 60, artists: 12 });
    expect(res.body.viewsPerDay).toHaveLength(30);
    expect(res.body.searchesPerDay).toHaveLength(30);
    expect(res.body.topPaintings.length).toBeLessThanOrEqual(10);
    expect(res.body.viewsByCategory).toHaveLength(6);
    expect(res.body.topQueries[0].query).toBe('calm landscapes');
    expect(res.body.recentActivity).toHaveLength(10);
    expect(res.body.recentActivity[0].text).toMatch(/^Ada viewed/);
    const week = await admin.get('/api/admin/overview').query({ days: 7 }).expect(200);
    expect(week.body.viewsPerDay).toHaveLength(7);
  });

  test('paintings list with search, category and pages', async () => {
    const res = await admin.get('/api/admin/paintings').query({ category: 'Flower' }).expect(200);
    expect(res.body.total).toBe(10);
    expect(Object.keys(res.body.items[0])).toEqual(expect.arrayContaining(['views', 'saves', 'featured', 'artist']));
    const search = await admin.get('/api/admin/paintings').query({ q: 'nwosu' }).expect(200);
    expect(search.body.items.every((p) => p.artist.slug === 'adaeze-nwosu')).toBe(true);
  });

  test('create, edit, feature and delete a painting, writing only to the temporary folder', async () => {
    const missing = await admin.post('/api/admin/paintings').field('title', '').expect(400);
    expect(missing.body.error.fields.title).toBeTruthy();

    const created = await admin.post('/api/admin/paintings')
      .field('title', 'Evening Light Test').field('artistSlug', 'adaeze-nwosu').field('year', '2024')
      .field('category', 'Landscape').field('style', 'Impressionism').field('medium', 'Oil').field('surface', 'Canvas')
      .field('widthCm', '80').field('heightCm', '60').field('mood', 'Calm').field('tags', JSON.stringify(['dusk', 'river']))
      .attach('image', await jpeg(800, 600, '#D9802E'), 'painting.jpg')
      .expect(201);
    const p = created.body.painting;
    expect(p).toMatchObject({ slug: 'evening-light-test', orientation: 'landscape', tags: ['dusk', 'river'] });
    expect(p.palette).toHaveLength(6);
    expect(existsSync(path.join(db.tempRoot, 'paintings', 'evening-light-test.jpg'))).toBe(true);
    expect(existsSync(path.join(defaultFolders.paintings, 'evening-light-test.jpg'))).toBe(false);

    const again = await admin.post('/api/admin/paintings')
      .field('title', 'Evening Light Test').field('artistSlug', 'adaeze-nwosu').field('year', '2024')
      .field('category', 'Landscape').field('style', 'Impressionism').field('medium', 'Oil').field('surface', 'Canvas')
      .field('widthCm', '80').field('heightCm', '60').attach('image', await jpeg(), 'p.jpg').expect(201);
    expect(again.body.painting.slug).toBe('evening-light-test-2');

    const edited = await admin.put(`/api/admin/paintings/${p.id}`).field('title', 'Evening Light Renamed').expect(200);
    expect(edited.body.painting).toMatchObject({ title: 'Evening Light Renamed', slug: 'evening-light-test' });
    const form = await admin.get(`/api/admin/paintings/${p.id}`).expect(200);
    expect(form.body.painting.artistSlug).toBe('adaeze-nwosu');

    const featured = await admin.patch(`/api/admin/paintings/${p.id}/featured`).send({ featured: true }).expect(200);
    expect(featured.body.painting.featured).toBe(true);

    const collection = await Collection.findOne({ slug: 'quiet_landscapes' });
    collection.paintings.push(p.id);
    await collection.save();
    await ada.post('/api/favourites').send({ slug: 'evening-light-test' }).expect(201);
    await admin.delete(`/api/admin/paintings/${p.id}`).expect(204);
    expect(await Favourite.countDocuments({ painting: p.id })).toBe(0);
    expect((await Collection.findOne({ slug: 'quiet_landscapes' })).paintings.map(String)).not.toContain(p.id);
    await admin.get(`/api/admin/paintings/${p.id}`).expect(404);
  });

  test('generate tags and summary from an uploaded image before saving', async () => {
    const before = await Painting.countDocuments();
    const res = await admin.post('/api/admin/paintings/generate').attach('image', await jpeg(600, 800, '#C9A04A'), 'g.jpg').expect(200);
    expect(Object.keys(res.body).sort()).toEqual(['category', 'mood', 'palette', 'style', 'summary', 'tags']);
    expect(res.body.tags.length).toBeGreaterThanOrEqual(3);
    expect(res.body.summary).toMatch(/\.$/);
    expect(await Painting.countDocuments()).toBe(before);
    const fromId = await admin.post('/api/admin/paintings/generate').send({ id: String((await Painting.findOne({ slug: 'koi-pond' }))._id) }).expect(200);
    expect(fromId.body.palette).toHaveLength(6);
  });

  test('artists: create with a photo, edit, and refuse to delete while they have paintings', async () => {
    const created = await admin.post('/api/admin/artists').field('name', 'Test Painter').field('country', 'Kenya').field('bornYear', '1990')
      .field('styles', JSON.stringify(['Realism'])).attach('photo', await jpeg(600, 900), 'a.jpg').expect(201);
    expect(created.body.artist).toMatchObject({ slug: 'test-painter', works: 0 });
    expect(await sharp(path.join(db.tempRoot, 'artists', 'test-painter.jpg')).metadata()).toMatchObject({ width: 400, height: 400 });
    const edited = await admin.put(`/api/admin/artists/${created.body.artist.id}`).field('country', 'Uganda').expect(200);
    expect(edited.body.artist.country).toBe('Uganda');
    const adaeze = await Artist.findOne({ slug: 'adaeze-nwosu' });
    const refused = await admin.delete(`/api/admin/artists/${adaeze._id}`).expect(409);
    expect(refused.body.error).toEqual({ message: 'This artist still has paintings. Move or delete them first.', code: 'CONFLICT' });
    await admin.delete(`/api/admin/artists/${created.body.artist.id}`).expect(204);
  });

  test('collections need four to eight paintings in a set order', async () => {
    const few = await admin.post('/api/admin/collections').send({ title: 'Too small', paintings: ['koi-pond'] }).expect(400);
    expect(few.body.error.fields.paintings).toBe('Choose between four and eight paintings.');
    const slugs = ['koi-pond', 'the-drummer', 'pentecost', 'harmattan'];
    const res = await admin.post('/api/admin/collections').send({ title: 'Staff picks', shortLine: 'Our favourites.', paintings: slugs }).expect(201);
    expect(res.body.collection).toMatchObject({ slug: 'staff_picks', count: 4, paintings: slugs });
    const updated = await admin.put(`/api/admin/collections/${res.body.collection.id}`).send({ paintings: [...slugs].reverse() }).expect(200);
    expect(updated.body.collection.paintings).toEqual([...slugs].reverse());
    await admin.delete(`/api/admin/collections/${res.body.collection.id}`).expect(204);
  });

  test('users: list with pages, roles, and no changes to yourself', async () => {
    const res = await admin.get('/api/admin/users').expect(200);
    expect(res.body.limit).toBe(12);
    expect(res.body.items).toHaveLength(12);
    expect(Object.keys(res.body.items[0]).sort()).toEqual(['active', 'avatar', 'email', 'id', 'joinedAt', 'lastActiveAt', 'name', 'role', 'verified']);
    const me = await User.findOne({ email: 'admin@artmind.test' });
    expect((await admin.patch(`/api/admin/users/${me._id}/role`).send({ role: 'user' }).expect(400)).body.error.message).toBe('You cannot change your own role.');
    expect((await admin.patch(`/api/admin/users/${me._id}/active`).send({ active: false }).expect(400)).body.error.message).toBe('You cannot deactivate yourself.');
    const other = await User.findOne({ email: 'sofia.rossi@example.com' });
    expect((await admin.patch(`/api/admin/users/${other._id}/role`).send({ role: 'admin' }).expect(200)).body.user.role).toBe('admin');
  });

  test('messages with filters, counts and status changes', async () => {
    const res = await admin.get('/api/admin/messages').expect(200);
    const total = await ContactMessage.countDocuments();
    expect(res.body.items).toHaveLength(total);
    expect(res.body.counts.new + res.body.counts.read + res.body.counts.replied).toBe(total);
    const fresh = await admin.get('/api/admin/messages').query({ status: 'new' }).expect(200);
    expect(fresh.body.items.every((m) => m.status === 'new')).toBe(true);
    const changed = await admin.patch(`/api/admin/messages/${fresh.body.items[0].id}`).send({ status: 'replied' }).expect(200);
    expect(changed.body.message.status).toBe('replied');
    await admin.patch(`/api/admin/messages/${fresh.body.items[0].id}`).send({ status: 'archived' }).expect(400);
  });
});
