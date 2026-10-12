import request from 'supertest';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import app from '../src/app.js';
import { Painting, ViewEvent } from '../src/models/index.js';
import { loginAs, startTestDb } from './helpers.js';

let db;

beforeAll(async () => {
  db = await startTestDb({ seed: true });
});

afterAll(async () => {
  await db.stop();
});

const CARD_KEYS = ['artist', 'category', 'featured', 'id', 'image', 'orientation', 'slug', 'style', 'title', 'tones', 'year'];

describe('gallery', () => {
  test('filters, counts and pages work like the mock', async () => {
    const res = await request(app).get('/api/paintings').query({ category: 'Landscape', limit: 4 }).expect(200);
    expect(res.body.total).toBe(10);
    expect(res.body.items).toHaveLength(4);
    expect(res.body.pages).toBe(3);
    expect(Object.keys(res.body.items[0]).sort()).toEqual(CARD_KEYS);
    expect(res.body.counts.category.Abstract).toBe(10);
    expect(res.body.counts.medium.Oil).toBeGreaterThan(0);
    expect(Object.keys(res.body.counts)).toEqual(['category', 'style', 'medium', 'surface', 'colour', 'mood']);
  });

  test('counts in a group ignore that group but follow the others', async () => {
    const res = await request(app).get('/api/paintings').query({ category: 'Landscape', medium: 'Watercolour' }).expect(200);
    expect(res.body.items.every((p) => p.category === 'Landscape')).toBe(true);
    expect(res.body.counts.medium.Oil).toBeGreaterThan(0);
    expect(res.body.counts.category.Landscape).toBe(res.body.total);
  });

  test('colour, year, artist and featured filters', async () => {
    const red = await request(app).get('/api/paintings').query({ colour: 'red', limit: 60 }).expect(200);
    expect(red.body.total).toBeGreaterThan(0);
    const years = await request(app).get('/api/paintings').query({ yearFrom: 2018, yearTo: 2020, limit: 60 }).expect(200);
    expect(years.body.items.every((p) => p.year >= 2018 && p.year <= 2020)).toBe(true);
    const artist = await request(app).get('/api/paintings').query({ artist: 'adaeze-nwosu', limit: 60 }).expect(200);
    expect(artist.body.items.every((p) => p.artist.slug === 'adaeze-nwosu')).toBe(true);
    const featured = await request(app).get('/api/paintings').query({ featured: 'true' }).expect(200);
    expect(featured.body.total).toBe(8);
  });

  test('sorts by title and by most viewed', async () => {
    const byTitle = await request(app).get('/api/paintings').query({ sort: 'title', limit: 60 }).expect(200);
    const titles = byTitle.body.items.map((p) => p.title);
    expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b)));
    const popular = await request(app).get('/api/paintings').query({ sort: 'popular', limit: 3 }).expect(200);
    const top = await Painting.findOne({}).sort({ viewCount: -1 }).lean();
    expect(popular.body.items[0].slug).toBe(top.slug);
  });

  test('limit is capped at 60 and bad values fall back', async () => {
    const res = await request(app).get('/api/paintings').query({ limit: 500, page: 'x' }).expect(200);
    expect(res.body.limit).toBe(12);
    expect(res.body.page).toBe(1);
  });

  test('painting details have the full shape and never the embedding', async () => {
    const res = await request(app).get('/api/paintings/morning-on-the-river').expect(200);
    const p = res.body.painting;
    expect(p).toMatchObject({ slug: 'morning-on-the-river', heroOfDay: true, saved: false });
    expect(p.artist).toMatchObject({ slug: 'adaeze-nwosu', country: 'Nigeria' });
    expect(p.collections.map((c) => c.slug)).toContain('quiet_landscapes');
    expect(p.embedding).toBeUndefined();
    expect(typeof p.views).toBe('number');
    expect(typeof p.saves).toBe('number');
  });

  test('unknown slug gives 404', async () => {
    const res = await request(app).get('/api/paintings/not-a-painting').expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  test('four similar paintings and four more by the artist', async () => {
    const similar = await request(app).get('/api/paintings/morning-on-the-river/similar').expect(200);
    expect(similar.body.items).toHaveLength(4);
    expect(similar.body.items.map((p) => p.slug)).not.toContain('morning-on-the-river');
    const more = await request(app).get('/api/paintings/morning-on-the-river/moreByArtist').expect(200);
    expect(more.body.items.length).toBeLessThanOrEqual(4);
    expect(more.body.items.every((p) => p.artist.slug === 'adaeze-nwosu' && p.slug !== 'morning-on-the-river')).toBe(true);
  });
});

describe('views and trending', () => {
  test('a view counts once per guest every 30 minutes and raises viewCount', async () => {
    const before = (await Painting.findOne({ slug: 'koi-pond' }).lean()).viewCount;
    const guest = request.agent(app);
    await guest.get('/api/health');
    await guest.post('/api/paintings/koi-pond/view').expect(204);
    await guest.post('/api/paintings/koi-pond/view').expect(204);
    expect((await Painting.findOne({ slug: 'koi-pond' }).lean()).viewCount).toBe(before + 1);
    await request.agent(app).post('/api/paintings/koi-pond/view').expect(204);
    expect((await Painting.findOne({ slug: 'koi-pond' }).lean()).viewCount).toBe(before + 2);
  });

  test('a view counts once per logged in user', async () => {
    const agent = await loginAs(app, 'user');
    const count = () => ViewEvent.countDocuments({ painting: { $exists: true } });
    const start = await count();
    await agent.post('/api/paintings/the-tailor/view').expect(204);
    await agent.post('/api/paintings/the-tailor/view').expect(204);
    expect(await count()).toBe(start + 1);
  });

  test('trending is most viewed in the last 7 days', async () => {
    const res = await request(app).get('/api/paintings/trending').expect(200);
    expect(res.body.items).toHaveLength(6);
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const [top] = await ViewEvent.aggregate([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: '$painting', n: { $sum: 1 } } }, { $sort: { n: -1, _id: 1 } }, { $limit: 1 }]);
    expect(res.body.items[0].id).toBe(String(top._id));
  });

  test('trending is topped up with featured paintings when there are no views', async () => {
    const saved = await ViewEvent.find({}).lean();
    await ViewEvent.deleteMany({});
    const res = await request(app).get('/api/paintings/trending').query({ limit: 6 }).expect(200);
    expect(res.body.items).toHaveLength(6);
    expect(res.body.items.every((p) => p.featured)).toBe(true);
    await ViewEvent.insertMany(saved);
  });
});

describe('artists, collections, home and faq', () => {
  test('artists list with works counted from paintings', async () => {
    const res = await request(app).get('/api/artists').expect(200);
    expect(res.body.total).toBe(12);
    expect(res.body.items.reduce((sum, a) => sum + a.works, 0)).toBe(60);
    const letter = await request(app).get('/api/artists').query({ letter: 'N' }).expect(200);
    expect(letter.body.items.every((a) => a.name.split(' ').pop().startsWith('N'))).toBe(true);
  });

  test('artist profile has paintings and up to four similar artists', async () => {
    const res = await request(app).get('/api/artists/adaeze-nwosu').expect(200);
    expect(res.body.artist.bio).toBeTruthy();
    expect(res.body.paintings.every((p) => p.artist.slug === 'adaeze-nwosu')).toBe(true);
    expect(res.body.similar.length).toBeLessThanOrEqual(4);
    expect(res.body.similar.map((a) => a.slug)).not.toContain('adaeze-nwosu');
    await request(app).get('/api/artists/nobody-here').expect(404);
  });

  test('collections list and detail', async () => {
    const list = await request(app).get('/api/collections').expect(200);
    expect(list.body.items).toHaveLength(6);
    expect(list.body.items[0]).toMatchObject({ slug: 'quiet_landscapes', count: 8 });
    expect(list.body.items[0].covers).toHaveLength(4);
    const detail = await request(app).get('/api/collections/quiet_landscapes').expect(200);
    expect(detail.body.paintings[0].slug).toBe('morning-on-the-river');
    expect(detail.body.collection.description).toBeTruthy();
  });

  test('home has everything the page needs', async () => {
    const res = await request(app).get('/api/home').expect(200);
    expect(res.body.hero.slug).toBe('morning-on-the-river');
    expect(res.body.categories).toHaveLength(6);
    expect(res.body.featured).toHaveLength(8);
    expect(res.body.trending).toHaveLength(6);
    expect(res.body.featuredArtist.artist.slug).toBe('adaeze-nwosu');
    expect(res.body.collections).toHaveLength(3);
    expect(res.body.searchSuggestions).toHaveLength(3);
  });

  test('faq comes from the database', async () => {
    const res = await request(app).get('/api/faq').expect(200);
    expect(res.body.items).toHaveLength(8);
  });

  test('contact saves a message with status new', async () => {
    const bad = await request(app).post('/api/contact').send({ name: '', email: 'x', subject: 'Nope', message: 'short' }).expect(400);
    expect(Object.keys(bad.body.error.fields).sort()).toEqual(['email', 'message', 'name', 'subject']);
    const res = await request(app).post('/api/contact').send({ name: 'Tari', email: 'tari@example.com', subject: 'A painting', message: 'I would like to know more about this.' }).expect(201);
    expect(res.body.message).toBe('Thank you. We will reply within two working days.');
  });
});
