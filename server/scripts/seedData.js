import { readFile } from 'node:fs/promises';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { config } from '../src/config/env.js';
import { findImage } from '../src/config/storage.js';
import {
  Artist, Collection, ContactMessage, Conversation, Faq, Favourite, Painting, SearchLog, Session, User, ViewEvent,
} from '../src/models/index.js';
import { answer, titleFor } from '../src/services/assistant/index.js';
import { analyseFile, measuresOf } from '../src/services/palette/index.js';
import { embedFile, isModelReady, loadModel } from '../src/services/recognition/index.js';
import { runSearch, understandWithRules } from '../src/services/search/index.js';

const DAY = 24 * 60 * 60 * 1000;
const readSeed = async (name) => JSON.parse(await readFile(path.join(config.paths.seed, name), 'utf8'));

function makeRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const EXTRA_USERS = [
  ['Chinedu Okeke', 'Nigeria'], ['Funmilayo Adebayo', 'Nigeria'], ['Emeka Nwachukwu', 'Nigeria'], ['Zainab Bello', 'Nigeria'],
  ['Tunde Bakare', 'Nigeria'], ['Ngozi Umeh', 'Nigeria'], ['Ibrahim Musa', 'Nigeria'], ['Kemi Oladipo', 'Nigeria'],
  ['Segun Afolabi', 'Nigeria'], ['Amaka Eze', 'Nigeria'], ['Yetunde Lawal', 'Nigeria'], ['Kwame Mensah', 'Ghana'],
  ['Amina Diallo', 'Senegal'], ['Sofia Rossi', 'Italy'], ['Lukas Becker', 'Germany'], ['Hannah Clarke', 'United Kingdom'],
  ['Mei Lin', 'China'], ['Arjun Mehta', 'India'], ['Camila Torres', 'Mexico'], ['Oliver Grant', 'Canada'],
];

const POPULAR = {
  'morning-on-the-river': 12, 'the-drummer': 10, 'koi-pond': 9, 'peonies-in-a-blue-jar': 8.5, 'annunciation-in-gold': 7.5,
  'evening-on-the-lagoon': 7, 'heron-in-the-reeds': 6.5, 'girl-in-a-yellow-scarf': 6, 'quiet-geometry': 5, 'the-long-road-home': 4.5,
};

const QUERIES = [
  ['calm landscapes', 124], ['flowers in oil', 98], ['abstract warm colours', 87], ['religious paintings on wood panel', 76],
  ['impressionist paintings', 65], ['modern art', 54], ['portrait paintings', 48], ['gold leaf', 42],
  ['birds by the water', 20], ['ink wash nature', 16], ['watercolour landscapes', 14], ['red abstract', 10], ['people at work', 8],
];

const ADA_FAVOURITES = ['morning-on-the-river', 'peonies-in-a-blue-jar', 'koi-pond', 'heron-in-the-reeds', 'woman-reading-by-the-window', 'madonna-of-the-olive-grove'];

const CONVERSATIONS = [
  { hoursAgo: 2, messages: ['Show me calm landscapes with soft light', 'Which of these are watercolours?'] },
  { hoursAgo: 26, messages: ['Explain impressionism in simple words', 'More like these'] },
  { hoursAgo: 50, messages: ['Which artist painted the most birds?', 'What is a wash?'] },
];

const MESSAGES = [
  ['Tolu Bankole', 'tolu@example.com', 'A painting', 'Hello, is Harbour Haze by Henrik Vos painted on linen or canvas? The details page says linen and I wanted to be sure.', 'new', 1],
  ['Grace Mensah', 'grace@example.com', 'My account', 'I did not get my six digit code the first time. Resending worked, but you may want to look at it.', 'read', 3],
  ['Daniel Okoro', 'daniel@example.com', 'General question', 'I love the Identify a style page. Will you add more paintings to the gallery later this year?', 'replied', 6],
  ['Bisi Adeyemi', 'bisi@example.com', 'An artist', 'Could you add more about Samuel Adeyemi? I would like to know where he trained and whether he has shown in Lagos.', 'new', 2],
  ['Peter Hansen', 'peter.hansen@example.com', 'Something is not working', 'The Word download on Pentecost opened fine, but on my phone the PDF took a long time. Is that expected?', 'new', 4],
  ['Rachel Adams', 'rachel@example.com', 'A painting', 'Is there a larger image of Annunciation in Gold? The gold leaf detail is beautiful and I would love to see it closer.', 'read', 8],
  ['Musa Garba', 'musa@example.com', 'Other', 'Our school art club would like to use ArtMind in class. Is there a way to share a collection with the students?', 'replied', 12],
  ['Lara Fischer', 'lara@example.com', 'General question', 'How does the search understand sentences? I typed peaceful blue paintings and the results were spot on.', 'new', 0.5],
];

export function missingSeedSettings() {
  return ['MONGODB_URI', 'SEED_ADMIN_PASSWORD', 'SEED_USER_PASSWORD'].filter((name) => !process.env[name]);
}

export async function seedDatabase({ log = console.log, useModel = true, activity = true } = {}) {
  const random = makeRandom(20261010);
  const pick = (list) => list[Math.floor(random() * list.length)];
  const now = Date.now();
  const [artists, paintings, collections, users, faq] = await Promise.all([
    readSeed('artists.json'), readSeed('paintings.json'), readSeed('collections.json'), readSeed('users.json'), readSeed('faq.json'),
  ]);

  await Promise.all([User, Artist, Painting, Collection, Favourite, ViewEvent, SearchLog, Conversation, ContactMessage, Session, Faq]
    .map((model) => model.deleteMany({})));
  log('Cleared old data');

  if (useModel) {
    try {
      await loadModel();
    } catch (err) {
      log(`Warning: ${err.message}. Paintings are saved without embeddings.`);
    }
  }

  const artistDocs = await Artist.insertMany(artists);
  const artistBySlug = new Map(artistDocs.map((a) => [a.slug, a]));

  const skipped = [];
  const prepared = [];
  for (const p of paintings) {
    const artist = artistBySlug.get(p.artistSlug);
    if (!artist) throw new Error(`Unknown artist ${p.artistSlug} on ${p.slug}`);
    const file = findImage('paintings', p.slug);
    const extra = { palette: [], dominantColour: '', embedding: undefined };
    if (!file) {
      skipped.push(`${p.slug}.jpg`);
    } else {
      const analysis = await analyseFile(file);
      if (analysis) Object.assign(extra, { palette: analysis.palette, dominantColour: analysis.dominantColour, measures: measuresOf(analysis.stats) });
      if (useModel && isModelReady()) extra.embedding = (await embedFile(file)) || undefined;
    }
    prepared.push({ ...p, ...extra, artist: artist._id });
  }
  if (skipped.length) log(`Warning: ${skipped.length} painting images are missing, so those paintings have no palette or embedding yet.`);

  const paintingDocs = await Painting.insertMany(prepared);
  await Painting.syncIndexes();
  const paintingBySlug = new Map(paintingDocs.map((p) => [p.slug, p]));

  await Collection.insertMany(collections.map((c) => ({
    ...c,
    paintings: c.paintings.map((slug) => {
      const painting = paintingBySlug.get(slug);
      if (!painting) throw new Error(`Unknown painting ${slug} in collection ${c.slug}`);
      return painting._id;
    }),
  })));
  await Faq.insertMany(faq.map((item, i) => ({ ...item, order: i + 1 })));

  const userDocs = [];
  for (const u of users) {
    const { passwordEnv, ...rest } = u;
    const passwordHash = await bcrypt.hash(process.env[passwordEnv], 12);
    userDocs.push(await User.create({ ...rest, passwordHash, lastActiveAt: new Date(now - random() * DAY) }));
  }
  const ada = userDocs.find((u) => u.email === 'ada@artmind.test');

  if (activity) {
    const sharedHash = await bcrypt.hash(process.env.SEED_USER_PASSWORD, 12);
    const categories = ['Abstract', 'Landscape', 'Flower', 'Nature', 'Figurative', 'Religious'];
    const extras = EXTRA_USERS.map(([name, country], i) => {
      const joined = new Date(now - (6 + random() * 174) * DAY);
      const interests = [...categories].sort(() => random() - 0.5).slice(0, 3);
      return {
        name,
        email: `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
        passwordHash: sharedHash,
        role: 'user',
        verified: i % 4 !== 3,
        country,
        interests,
        joinedAt: joined,
        lastActiveAt: new Date(Math.min(now, joined.getTime() + random() * (now - joined.getTime()))),
      };
    });
    userDocs.push(...(await User.insertMany(extras)));
    await seedActivity({ ada, users: userDocs.filter((u) => u.role === 'user' && u.verified), paintingDocs, paintingBySlug, random, pick, now, log });
  }

  const counts = {};
  for (const [label, model] of Object.entries({ artists: Artist, paintings: Painting, collections: Collection, faq: Faq, users: User, views: ViewEvent, searches: SearchLog, favourites: Favourite, conversations: Conversation, messages: ContactMessage })) {
    counts[label] = await model.countDocuments();
  }
  return { counts, skipped };
}

async function seedActivity({ ada, users, paintingDocs, paintingBySlug, random, pick, now, log }) {
  const weights = paintingDocs.map((p) => ({ p, w: POPULAR[p.slug] || (p.featured ? 3 : 0.6 + random() * 1.6) }));
  const total = weights.reduce((s, x) => s + x.w, 0);
  const weightedPick = () => {
    let r = random() * total;
    for (const x of weights) {
      r -= x.w;
      if (r <= 0) return x.p;
    }
    return weights[weights.length - 1].p;
  };
  const others = users.filter((u) => String(u._id) !== String(ada._id));

  const views = [];
  for (let d = 29; d >= 0; d -= 1) {
    const count = 55 + Math.round((29 - d) * 2.8 + random() * 25);
    for (let i = 0; i < count; i += 1) {
      const painting = weightedPick();
      const byUser = random() < 0.25;
      views.push({
        painting: painting._id,
        category: painting.category,
        user: byUser ? pick(others)._id : null,
        visitorId: byUser ? '' : `seedvisitor${Math.floor(random() * 300)}`,
        createdAt: new Date(now - d * DAY - random() * DAY * (d === 0 ? 0.4 : 1)),
      });
    }
  }
  const adaPool = paintingDocs.filter((p) => ada.interests.includes(p.category) || p.category === 'Figurative');
  for (let i = 0; i < 38; i += 1) {
    const painting = pick(adaPool);
    views.push({ painting: painting._id, category: painting.category, user: ada._id, createdAt: new Date(now - random() * 20 * DAY) });
  }
  for (const [i, slug] of ['morning-on-the-river', 'the-drummer', 'koi-pond', 'evening-on-the-lagoon', 'girl-in-a-yellow-scarf'].entries()) {
    const painting = paintingBySlug.get(slug);
    views.push({ painting: painting._id, category: painting.category, user: ada._id, createdAt: new Date(now - (2 + i * 12) * 60 * 1000) });
  }
  await ViewEvent.insertMany(views);
  const perPainting = new Map();
  for (const v of views) perPainting.set(String(v.painting), (perPainting.get(String(v.painting)) || 0) + 1);
  await Painting.bulkWrite(paintingDocs.map((p) => ({ updateOne: { filter: { _id: p._id }, update: { viewCount: perPainting.get(String(p._id)) || 0 } } })));
  log(`Sample views: ${views.length}`);

  const resultCounts = new Map();
  for (const [query] of QUERIES) resultCounts.set(query, (await runSearch(await understandWithRules(query))).length);
  // Each query gets a fixed share, so the top queries keep the order shown on the admin design.
  const searches = [];
  for (const [query, weight] of QUERIES) {
    for (let i = 0; i < Math.round(weight * 0.6); i += 1) {
      const daysAgo = Math.floor((1 - Math.sqrt(random())) * 30);
      const byUser = random() < 0.3;
      searches.push({
        query, normalised: query, resultCount: resultCounts.get(query), user: byUser ? pick(users)._id : null,
        visitorId: byUser ? '' : `seedvisitor${Math.floor(random() * 300)}`, createdAt: new Date(now - daysAgo * DAY - random() * DAY * (daysAgo === 0 ? 0.4 : 1)),
      });
    }
  }
  searches.push({ query: 'calm landscapes', normalised: 'calm landscapes', resultCount: resultCounts.get('calm landscapes'), user: ada._id, createdAt: new Date(now - 18 * 60 * 1000) });
  searches.push({ query: 'flowers in oil', normalised: 'flowers in oil', resultCount: resultCounts.get('flowers in oil'), user: ada._id, createdAt: new Date(now - 65 * 60 * 1000) });
  await SearchLog.insertMany(searches);
  log(`Sample searches: ${searches.length}`);

  const favourites = ADA_FAVOURITES.filter((slug) => paintingBySlug.has(slug))
    .map((slug, i) => ({ user: ada._id, painting: paintingBySlug.get(slug)._id, createdAt: new Date(now - (i + 1) * DAY) }));
  const taken = new Set();
  for (const user of others) {
    for (let i = 0; i < 2 + Math.floor(random() * 5); i += 1) {
      const painting = weightedPick();
      const key = `${user._id}:${painting._id}`;
      if (taken.has(key)) continue;
      taken.add(key);
      favourites.push({ user: user._id, painting: painting._id, createdAt: new Date(now - random() * 28 * DAY) });
    }
  }
  await Favourite.insertMany(favourites);
  log(`Favourites: ${favourites.length}`);

  for (const c of CONVERSATIONS) {
    const start = now - c.hoursAgo * 3600 * 1000;
    const messages = [];
    let history = [];
    for (const [i, text] of c.messages.entries()) {
      const reply = await answer({ message: text, history, useModel: false });
      const at = new Date(start + i * 60 * 1000);
      messages.push({ role: 'user', text, createdAt: at });
      messages.push({ role: 'assistant', text: reply.text, paintings: reply.paintings.map((p) => p.slug), followUps: reply.followUps, createdAt: at });
      history = messages.map((m) => ({ role: m.role, text: m.text, paintings: m.paintings || [] }));
    }
    const conversation = new Conversation({ user: ada._id, title: titleFor(c.messages[0]), messages });
    conversation.$timestamps(false);
    conversation.createdAt = new Date(start);
    conversation.updatedAt = new Date(start + 60 * 1000);
    await conversation.save();
  }
  log(`Ada's conversations: ${CONVERSATIONS.length}`);

  await ContactMessage.insertMany(MESSAGES.map(([name, email, subject, message, status, daysAgo]) => ({ name, email, subject, message, status, createdAt: new Date(now - daysAgo * DAY) })));
}
