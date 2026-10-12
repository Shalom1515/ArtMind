import request from 'supertest';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import app from '../src/app.js';
import { Favourite, User, ViewEvent } from '../src/models/index.js';
import { recommendFor } from '../src/services/recommendations/index.js';
import { loginAs, startTestDb } from './helpers.js';

let db;
let ada;

beforeAll(async () => {
  db = await startTestDb({ seed: true });
  ada = await loginAs(app, 'user');
});

afterAll(async () => {
  await db.stop();
});

const REASON = /^(Because you saved .+|Matches your interest in (Abstract|Landscape|Flower|Nature|Figurative|Religious)|Because you viewed (Abstract|Landscape|Flower|Nature|Figurative|Religious) recently|Popular with visitors this week)$/;

describe('recommendations', () => {
  test('every result carries a reason line like the designs', async () => {
    const res = await ada.get('/api/recommendations').expect(200);
    expect(res.body.items).toHaveLength(8);
    for (const item of res.body.items) {
      expect(item.reason).toMatch(REASON);
      expect(item.painting.slug).toBeTruthy();
    }
    console.log(res.body.items.map((i) => `${i.painting.title}: ${i.reason}`).join('\n'));
  });

  test('saved and interest reasons both show up for Ada', async () => {
    const res = await ada.get('/api/recommendations').query({ limit: 12 }).expect(200);
    const reasons = res.body.items.map((i) => i.reason);
    expect(reasons.some((r) => r.startsWith('Because you saved'))).toBe(true);
    expect(reasons.some((r) => r.startsWith('Matches your interest in'))).toBe(true);
  });

  test('paintings already seen or saved are left out', async () => {
    const user = await User.findOne({ email: 'ada@artmind.test' });
    const seen = new Set([
      ...(await ViewEvent.find({ user: user._id }).lean()).map((v) => String(v.painting)),
      ...(await Favourite.find({ user: user._id }).lean()).map((f) => String(f.painting)),
    ]);
    const res = await ada.get('/api/recommendations').expect(200);
    expect(res.body.items.some((i) => seen.has(i.painting.id))).toBe(false);
  });

  test('a user with nothing yet falls back to interests', async () => {
    const fresh = await User.findOne({ email: 'amina.diallo@example.com' });
    await ViewEvent.deleteMany({ user: fresh._id });
    await Favourite.deleteMany({ user: fresh._id });
    const items = await recommendFor(fresh, 6);
    expect(items).toHaveLength(6);
    expect(items.every((i) => i.reason === `Matches your interest in ${i.painting.category}` || i.reason === 'Popular with visitors this week')).toBe(true);
  });

  test('logged out visitors get trending and featured paintings from the service, and 401 from the endpoint', async () => {
    const items = await recommendFor(null, 6);
    expect(items).toHaveLength(6);
    await request(app).get('/api/recommendations').expect(401);
  });
});

describe('dashboard insights', () => {
  test('stats, categories, taste and collections for you', async () => {
    const res = await ada.get('/api/me/insights').expect(200);
    const body = res.body;
    expect(Object.keys(body).sort()).toEqual(['collectionsForYou', 'favouriteCategories', 'recentlyViewed', 'recommended', 'stats', 'taste']);
    expect(body.stats).toMatchObject({ favourites: 6, conversations: 3 });
    expect(body.stats.viewed).toBeGreaterThan(30);
    expect(body.recentlyViewed.length).toBeLessThanOrEqual(6);
    expect(body.favouriteCategories[0].count).toBeGreaterThanOrEqual(body.favouriteCategories[1].count);
    expect(body.taste).toMatch(/^(You keep coming back|.+ is where you spend|Your eye goes)/);
    expect(body.collectionsForYou).toHaveLength(3);
    for (const c of body.collectionsForYou) {
      expect(c.title).toBeTruthy();
      expect(c.reason).toBeTruthy();
      expect(c.paintings.length).toBeGreaterThanOrEqual(2);
    }
  });

  test('refresh writes a new taste sentence', async () => {
    const first = (await ada.get('/api/me/insights')).body.taste;
    const res = await ada.post('/api/me/insights/taste').expect(200);
    expect(res.body.taste).toBeTruthy();
    expect(res.body.taste).not.toBe(first);
  });
});

describe('assistant', () => {
  test('a guest gets an answer with paintings and no saved conversation', async () => {
    const res = await request(app).post('/api/assistant/messages').send({ message: 'Show me calm landscapes with soft light' }).expect(200);
    expect(res.body.conversationId).toBeNull();
    expect(res.body.reply.role).toBe('assistant');
    expect(res.body.reply.paintings.length).toBeGreaterThan(0);
    expect(res.body.reply.paintings.length).toBeLessThanOrEqual(3);
    expect(res.body.reply.followUps.length).toBeGreaterThanOrEqual(2);
    expect(res.body.reply.followUps.length).toBeLessThanOrEqual(3);
  });

  test('the glossary answers without the model', async () => {
    const res = await request(app).post('/api/assistant/messages').send({ message: 'What is gold leaf?' }).expect(200);
    expect(res.body.reply.text).toMatch(/gold/i);
    const compare = await request(app).post('/api/assistant/messages').send({ message: 'Oil or tempera, what is the difference?' }).expect(200);
    expect(compare.body.reply.text).toMatch(/egg yolk/);
  });

  test('guests send their history and follow ups use it', async () => {
    const first = await request(app).post('/api/assistant/messages').send({ message: 'Show me calm landscapes with soft light' });
    const history = [{ role: 'user', text: 'Show me calm landscapes with soft light' }, { role: 'assistant', text: first.body.reply.text, paintings: first.body.reply.paintings }];
    const res = await request(app).post('/api/assistant/messages').send({ message: 'More like these', history }).expect(200);
    const before = first.body.reply.paintings.map((p) => p.slug);
    expect(res.body.reply.paintings.some((p) => before.includes(p.slug))).toBe(false);
  });

  test('it understands the painting it was opened from and helps find pages', async () => {
    const res = await request(app).post('/api/assistant/messages').send({ message: 'Tell me about this painting', context: { paintingSlug: 'the-drummer' } }).expect(200);
    expect(res.body.reply.text).toMatch(/The Drummer/);
    const help = await request(app).post('/api/assistant/messages').send({ message: 'How can I upload a photo of a painting?' }).expect(200);
    expect(help.body.reply.text).toMatch(/Identify a style/);
  });

  test('logged in users have conversations saved and titled from the first message', async () => {
    const first = await ada.post('/api/assistant/messages').send({ message: 'Which artist painted the most birds?' }).expect(200);
    const id = first.body.conversationId;
    expect(id).toMatch(/^[a-f0-9]{24}$/);
    await ada.post('/api/assistant/messages').send({ conversationId: id, message: 'Tell me more' }).expect(200);
    const list = await ada.get('/api/assistant/conversations').expect(200);
    expect(list.body.items[0]).toMatchObject({ id, title: 'Which artist painted the most birds' });
    const detail = await ada.get(`/api/assistant/conversations/${id}`).expect(200);
    expect(detail.body.conversation.messages).toHaveLength(4);
    await ada.delete(`/api/assistant/conversations/${id}`).expect(204);
    await ada.get(`/api/assistant/conversations/${id}`).expect(404);
  });

  test('an empty message is a validation error', async () => {
    const res = await request(app).post('/api/assistant/messages').send({ message: ' ' }).expect(400);
    expect(res.body.error.fields.message).toBe('Type a question first.');
  });
});
