import artistsSeed from '../../../../server/data/seed/artists.json';
import collectionsSeed from '../../../../server/data/seed/collections.json';
import faqSeed from '../../../../server/data/seed/faq.json';
import paintingsSeed from '../../../../server/data/seed/paintings.json';
import usersSeed from '../../../../server/data/seed/users.json';
import { readJson, removeKey, writeJson } from '../../utils/storage.js';

const KEY = 'artmind_mock_v1';
const DAY = 24 * 60 * 60 * 1000;

export const DEMO_PASSWORD = 'Demo1234';
export const faq = faqSeed;

export class MockError extends Error {
  constructor(status, message, code, fields) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export const fail = (status, message, code, fields) => {
  throw new MockError(status, message, code, fields);
};

export function newId(prefix) {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function makeRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function freshState() {
  const now = Date.now();
  const pad = (n) => String(n).padStart(2, '0');

  const artists = artistsSeed.map((a, i) => ({ ...a, id: `a${pad(i + 1)}` }));
  const paintings = paintingsSeed.map((p) => ({ ...p, id: p.code.toLowerCase(), createdAt: new Date(now - 60 * DAY).toISOString() }));
  const collections = collectionsSeed.map((c, i) => ({ ...c, id: `c${pad(i + 1)}` }));
  const users = usersSeed.map((u, i) => {
    const { passwordEnv, ...rest } = u;
    return { ...rest, id: `u${pad(i + 1)}`, password: DEMO_PASSWORD, active: true, avatar: null, lastActiveAt: new Date(now - i * 3600 * 1000).toISOString(), tasteSummary: '' };
  });
  const ada = users.find((u) => u.role === 'user');

  const random = makeRandom(20261010);
  const pick = (list) => list[Math.floor(random() * list.length)];
  const weighted = paintings.flatMap((p) => Array(p.heroOfDay ? 8 : p.featured ? 6 : 2).fill(p));
  const views = [];
  for (let d = 29; d >= 0; d -= 1) {
    const count = 20 + Math.round((29 - d) * 1.6 + random() * 18);
    for (let i = 0; i < count; i += 1) {
      views.push({ slug: pick(weighted).slug, userId: null, visitorId: `demo${i % 40}`, at: new Date(now - d * DAY - random() * DAY).toISOString() });
    }
  }
  const adaPool = paintings.filter((p) => ada.interests.includes(p.category) || p.category === 'Figurative');
  for (let i = 0; i < 38; i += 1) {
    views.push({ slug: pick(adaPool).slug, userId: ada.id, visitorId: '', at: new Date(now - random() * 20 * DAY).toISOString() });
  }

  const queries = [
    'calm landscapes', 'flowers in oil', 'abstract with warm colours', 'religious paintings on wood panel',
    'impressionist paintings', 'birds by the water', 'paintings with gold leaf', 'ink wash nature', 'portraits of people at work',
  ];
  const searches = [];
  for (let d = 29; d >= 0; d -= 1) {
    const count = 4 + Math.round(random() * 8 + (29 - d) * 0.3);
    for (let i = 0; i < count; i += 1) {
      const query = queries[Math.min(queries.length - 1, Math.floor(random() * random() * queries.length))];
      searches.push({ query, userId: null, at: new Date(now - d * DAY - random() * DAY).toISOString() });
    }
  }

  const saved = ['morning-on-the-river', 'peonies-in-a-blue-jar', 'koi-pond', 'heron-in-the-reeds', 'woman-reading-by-the-window', 'madonna-of-the-olive-grove'];
  const favourites = saved.map((slug, i) => ({ userId: ada.id, slug, savedAt: new Date(now - (i + 1) * DAY).toISOString() }));

  const conversations = [
    { title: 'Calm landscapes with soft light', hoursAgo: 2 },
    { title: 'Impressionist painters', hoursAgo: 26 },
    { title: 'Birds in art', hoursAgo: 50 },
  ].map((c, i) => ({
    id: `v${pad(i + 1)}`,
    userId: ada.id,
    title: c.title,
    context: {},
    updatedAt: new Date(now - c.hoursAgo * 3600 * 1000).toISOString(),
    messages: [
      { id: `m${i}a`, role: 'user', text: c.title, paintings: [], followUps: [], createdAt: new Date(now - c.hoursAgo * 3600 * 1000).toISOString() },
    ],
  }));

  const messages = [
    { name: 'Tolu Bankole', email: 'tolu@example.com', subject: 'A painting', message: 'Hello, is Harbour Haze by Henrik Vos painted on linen or canvas? The details page says linen and I wanted to be sure.', status: 'new', days: 2 },
    { name: 'Grace Mensah', email: 'grace@example.com', subject: 'My account', message: 'I did not get my six digit code the first time. Resending worked, but you may want to look at it.', status: 'read', days: 4 },
    { name: 'Daniel Okoro', email: 'daniel@example.com', subject: 'General question', message: 'I love the Identify a style page. Will you add more paintings to the gallery later this year?', status: 'replied', days: 7 },
  ].map(({ days, ...m }, i) => ({ ...m, id: `g${pad(i + 1)}`, createdAt: new Date(now - days * DAY).toISOString() }));

  return {
    version: 1,
    sessionUserId: null,
    users,
    artists,
    paintings,
    collections,
    favourites,
    views,
    searches,
    conversations,
    messages,
    registrations: users.map((u) => ({ userId: u.id, at: u.joinedAt })),
  };
}

let state = null;

export function db() {
  if (!state) {
    const saved = readJson(KEY);
    state = saved && saved.version === 1 ? saved : freshState();
  }
  return state;
}

export function save() {
  try {
    writeJson(KEY, state);
  } catch {
  }
}

export function resetMockData() {
  removeKey(KEY);
  state = freshState();
  save();
}

export const artistBySlug = (slug) => db().artists.find((a) => a.slug === slug);
export const paintingBySlug = (slug) => db().paintings.find((p) => p.slug === slug);
export const userById = (id) => db().users.find((u) => u.id === id);
export const userByEmail = (email = '') => db().users.find((u) => u.email === email.trim().toLowerCase());

export function currentUser() {
  const user = userById(db().sessionUserId);
  return user && user.active ? user : null;
}

export function requireUser() {
  const user = currentUser();
  if (!user) fail(401, 'Please log in to continue.', 'UNAUTHENTICATED');
  user.lastActiveAt = new Date().toISOString();
  return user;
}

export function requireAdmin() {
  const user = requireUser();
  if (user.role !== 'admin') fail(403, 'Only admins can do that.', 'FORBIDDEN');
  return user;
}

export function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id, name: u.name, email: u.email, role: u.role, verified: u.verified, country: u.country,
    bio: u.bio, avatar: u.avatar, interests: u.interests, joinedAt: u.joinedAt,
  };
}

export function toCard(p) {
  const artist = artistBySlug(p.artistSlug);
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    artist: { slug: p.artistSlug, name: artist?.name || '' },
    year: p.year,
    category: p.category,
    style: p.style,
    orientation: p.orientation,
    image: p.image,
    tones: p.tones,
    featured: p.featured,
  };
}

export const viewCount = (slug) => db().views.filter((v) => v.slug === slug).length;
export const saveCount = (slug) => db().favourites.filter((f) => f.slug === slug).length;

export function toPainting(p) {
  const artist = artistBySlug(p.artistSlug);
  const user = currentUser();
  return {
    ...toCard(p),
    code: p.code,
    medium: p.medium,
    surface: p.surface,
    widthCm: p.widthCm,
    heightCm: p.heightCm,
    colours: p.colours,
    colourGroups: p.colourGroups,
    mood: p.mood,
    description: p.description,
    summary: p.summary,
    tags: p.tags,
    palette: p.palette,
    heroOfDay: p.heroOfDay,
    artist: artist
      ? { slug: artist.slug, name: artist.name, country: artist.country, bornYear: artist.bornYear, portrait: artist.portrait }
      : { slug: p.artistSlug, name: '' },
    collections: db().collections.filter((c) => c.paintings.includes(p.slug)).map((c) => ({ slug: c.slug, title: c.title })),
    views: viewCount(p.slug),
    saves: saveCount(p.slug),
    saved: Boolean(user && db().favourites.some((f) => f.userId === user.id && f.slug === p.slug)),
  };
}

export function toArtistCard(a) {
  return {
    id: a.id, slug: a.slug, name: a.name, country: a.country, bornYear: a.bornYear, styles: a.styles,
    portrait: a.portrait, works: db().paintings.filter((p) => p.artistSlug === a.slug).length,
  };
}

export function toCollectionCard(c) {
  const covers = c.paintings.slice(0, 4).map(paintingBySlug).filter(Boolean).map(toCard);
  return { id: c.id, slug: c.slug, title: c.title, shortLine: c.shortLine, count: c.paintings.length, covers };
}

export function paginate(items, query, defaultLimit = 12) {
  const limit = Math.min(Math.max(Number(query.limit) || defaultLimit, 1), 60);
  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  const page = Math.min(Math.max(Number(query.page) || 1, 1), pages);
  return { items: items.slice((page - 1) * limit, page * limit), page, limit, total, pages };
}
