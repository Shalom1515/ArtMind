import request from 'supertest';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import app from '../src/app.js';
import { SearchLog } from '../src/models/index.js';
import * as modelClient from '../src/services/assistant/modelClient.js';
import { understand } from '../src/services/search/index.js';
import { startTestDb } from './helpers.js';

let db;

beforeAll(async () => {
  db = await startTestDb({ seed: true });
});

afterAll(async () => {
  await db.stop();
});

const keys = async (sentence) => (await understand(sentence)).map((c) => c.key);

describe('search parsing', () => {
  test('Show oil paintings with nature themes', async () => {
    expect(await keys('Show oil paintings with nature themes')).toEqual(['category:Nature', 'medium:Oil']);
  });

  test('Find watercolor landscape paintings', async () => {
    expect(await keys('Find watercolor landscape paintings')).toEqual(['category:Landscape', 'medium:Watercolour']);
  });

  test('Modern abstract paintings on canvas', async () => {
    expect(await keys('Modern abstract paintings on canvas')).toEqual(['category:Abstract', 'style:Modern', 'surface:Canvas']);
  });

  test('the three home page chips', async () => {
    expect(await keys('calm landscapes')).toEqual(['category:Landscape', 'mood:Calm']);
    expect(await keys('abstract with warm colours')).toEqual(['category:Abstract', 'colour:warm']);
    expect(await keys('religious paintings on wood panel')).toEqual(['category:Religious', 'surface:Wood panel']);
  });

  test('synonyms map to our values', async () => {
    expect(await keys('peaceful flowers')).toEqual(['category:Flower', 'mood:Calm']);
    expect(await keys('holy portraits')).toEqual(expect.arrayContaining(['category:Religious', 'category:Figurative']));
    expect(await keys('cool colours with birds')).toEqual(['category:Nature', 'colour:cool']);
    expect(await keys('paintings by Adaeze Nwosu from the 2010s')).toEqual(['artist:Adaeze Nwosu', 'year:2010s']);
  });

  test('chips carry a key, type, value and label like the mock', async () => {
    const [chip] = await understand('calm landscapes');
    expect(chip).toEqual({ key: 'category:Landscape', type: 'category', value: 'Landscape', label: 'Category: Landscape' });
  });
});

describe('search endpoint', () => {
  test('calm landscapes, then the mood chip removed, like the mock', async () => {
    const res = await request(app).get('/api/search').query({ q: 'calm landscapes' }).expect(200);
    expect(res.body.understood.map((c) => c.label)).toEqual(['Category: Landscape', 'Mood: Calm']);
    expect(res.body.total).toBe(8);
    expect(res.body.items.every((p) => p.category === 'Landscape')).toBe(true);
    const wider = await request(app).get('/api/search').query({ q: 'calm landscapes', exclude: 'mood:Calm' }).expect(200);
    expect(wider.body.total).toBe(10);
    expect(wider.body.understood.map((c) => c.key)).toEqual(['category:Landscape']);
  });

  test('the test sentences find matching paintings', async () => {
    const oil = await request(app).get('/api/search').query({ q: 'Show oil paintings with nature themes' }).expect(200);
    expect(oil.body.items.every((p) => p.category === 'Nature')).toBe(true);
    const modern = await request(app).get('/api/search').query({ q: 'Modern abstract paintings on canvas' }).expect(200);
    expect(modern.body.total).toBeGreaterThan(0);
    expect(modern.body.items.every((p) => p.category === 'Abstract')).toBe(true);
  });

  test('every new search is logged with its result count and visitor', async () => {
    const before = await SearchLog.countDocuments();
    const res = await request(app).get('/api/search').query({ q: 'gold leaf angels' }).expect(200);
    const log = await SearchLog.findOne({}).sort({ createdAt: -1 }).lean();
    expect(await SearchLog.countDocuments()).toBe(before + 1);
    expect(log.query).toBe('gold leaf angels');
    expect(log.resultCount).toBe(res.body.total);
    expect(log.visitorId).toMatch(/^[a-f0-9]{32}$/);
  });

  test('an empty query is a validation error', async () => {
    const res = await request(app).get('/api/search').query({ q: '  ' }).expect(400);
    expect(res.body.error.fields.q).toBe('Type what you would like to see.');
  });

  test('model chips are merged but only values from our data are kept', async () => {
    vi.mocked(modelClient.isAvailable).mockReturnValue(true);
    vi.mocked(modelClient.chatJson).mockResolvedValueOnce({ category: ['Landscape', 'Seascape'], mood: ['Calm'], style: ['Cubism'], colour: ['blue'] });
    const chips = await understand('somewhere to rest my eyes');
    vi.mocked(modelClient.isAvailable).mockReturnValue(false);
    const found = chips.filter((c) => c.type !== 'keyword').map((c) => c.key);
    expect(found).toEqual(['category:Landscape', 'colour:blue', 'mood:Calm']);
  });

  test('when the model fails the rules still answer', async () => {
    vi.mocked(modelClient.isAvailable).mockReturnValue(true);
    vi.mocked(modelClient.chatJson).mockResolvedValueOnce(null);
    const chips = await understand('calm landscapes');
    vi.mocked(modelClient.isAvailable).mockReturnValue(false);
    expect(chips.map((c) => c.key)).toEqual(['category:Landscape', 'mood:Calm']);
  });
});

describe('GET /api/search/suggest', () => {
  test('suggests paintings whose title starts with the typed letters, best match first', async () => {
    const { Painting } = await import('../src/models/index.js');
    const sample = await Painting.findOne({}).lean();
    const typed = sample.title.slice(0, 2);
    const res = await request(app).get('/api/search/suggest').query({ q: typed }).expect(200);
    expect(res.body.suggestions.length).toBeGreaterThan(0);
    expect(res.body.suggestions.length).toBeLessThanOrEqual(6);
    expect(res.body.suggestions[0].title.toLowerCase().startsWith(typed.toLowerCase())).toBe(true);
    expect(res.body.suggestions[0]).toMatchObject({ slug: expect.any(String), image: expect.any(String) });
  });

  test('returns nothing for an empty query and does not log it', async () => {
    const before = await SearchLog.countDocuments();
    const res = await request(app).get('/api/search/suggest').query({ q: ' ' }).expect(200);
    expect(res.body.suggestions).toEqual([]);
    expect(await SearchLog.countDocuments()).toBe(before);
  });

  test('treats regex characters as plain text', async () => {
    const res = await request(app).get('/api/search/suggest').query({ q: '.*(' }).expect(200);
    expect(res.body.suggestions).toEqual([]);
  });
});
