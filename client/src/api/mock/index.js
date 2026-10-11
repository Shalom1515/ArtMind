import { CATEGORIES, COLOUR_GROUPS, CONTACT_SUBJECTS } from '../../utils/constants.js';
import { isEmail, passwordProblem } from '../../utils/password.js';
import { reply, SUGGESTIONS, titleFor } from './assistant.js';
import {
  artistBySlug, currentUser, db, faq, fail, MockError, newId, paginate, paintingBySlug, publicUser, requireAdmin,
  requireUser, resetMockData, save, saveCount, toArtistCard, toCard, toCollectionCard, toPainting, userByEmail,
  userById, viewCount,
} from './db.js';
import { jsonBlob, makeDocx, makePdf, paintingBlocks } from './files.js';
import { colourDistance, readPalette, shrinkToDataUrl } from './images.js';
import { filterPaintings, insights, overview, recommend, runSearch, similarTo, sortPaintings, tasteText, trending, understand } from './logic.js';

export { resetMockData };

let delayRange = [120, 420];
export function setMockDelay(min, max = min) {
  delayRange = [min, max];
}

const wait = () => {
  const [min, max] = delayRange;
  const ms = min + Math.random() * (max - min);
  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
};

const ok = (data, status = 200) => ({ status, data });
const noContent = () => ({ status: 204, data: null });
const list = (value) => (value ? String(value).split(',').map((v) => v.trim()).filter(Boolean) : []);
const now = () => new Date().toISOString();

function field(body, key) {
  if (!body) return undefined;
  if (typeof FormData !== 'undefined' && body instanceof FormData) {
    const value = body.get(key);
    return value === null ? undefined : value;
  }
  return body[key];
}

function jsonField(body, key, fallback = []) {
  const value = field(body, key);
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function validationError(fields) {
  fail(400, 'Please check the highlighted fields.', 'VALIDATION', fields);
}

function visitorId() {
  try {
    let id = sessionStorage.getItem('artmind_visitor');
    if (!id) {
      id = newId('visitor');
      sessionStorage.setItem('artmind_visitor', id);
    }
    return id;
  } catch {
    return 'visitor';
  }
}

function checkPassword(password, key = 'password') {
  const problem = passwordProblem(password || '');
  if (problem) validationError({ [key]: problem });
}

const lettersOnly = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');


const routes = [];
const route = (method, pattern, handler) => {
  const keys = [];
  const regex = new RegExp(`^${pattern.replace(/:(\w+)/g, (_, key) => {
    keys.push(key);
    return '([^/]+)';
  })}$`);
  routes.push({ method, regex, keys, handler });
};


route('GET', '/health', () => ok({ status: 'ok', database: 'mock' }));

route('GET', '/options', () => {
  const ps = db().paintings;
  const uniq = (read) => [...new Set(ps.map(read))].sort();
  return ok({
    categories: CATEGORIES,
    styles: uniq((p) => p.style),
    mediums: ['Acrylic', 'Charcoal', 'Gouache', 'Ink', 'Mixed media', 'Oil', 'Pastel', 'Tempera', 'Watercolour'],
    surfaces: ['Board', 'Canvas', 'Linen', 'Paper', 'Wood panel'],
    moods: ['Calm', 'Dramatic', 'Energetic', 'Joyful', 'Melancholic', 'Solemn', 'Tender'],
    colours: COLOUR_GROUPS,
  });
});

route('GET', '/faq', () => ok({ items: faq }));


export function syncSession(path, data) {
  const state = db();
  if (path === '/auth/logout' || (path === '/auth/me' && !data?.user)) {
    state.sessionUserId = null;
    save();
    return;
  }
  const remote = data?.user;
  if (!remote) return;
  let local = userByEmail(remote.email);
  if (!local) {
    local = { id: remote.id, password: null, active: true, tasteSummary: '', lastActiveAt: now() };
    state.users.push(local);
    state.registrations.push({ userId: local.id, at: remote.joinedAt || now() });
  }
  Object.assign(local, {
    name: remote.name, email: remote.email, role: remote.role, verified: remote.verified, country: remote.country || '',
    bio: remote.bio || '', interests: remote.interests || [], joinedAt: remote.joinedAt || local.joinedAt, avatar: remote.avatar ?? local.avatar ?? null,
  });
  state.sessionUserId = local.id;
  save();
}


function categoryTiles() {
  return CATEGORIES.map((name) => ({
    name,
    count: db().paintings.filter((p) => p.category === name).length,
    image: `/images/categories/${name.toLowerCase()}.jpg`,
  }));
}

route('GET', '/categories', () => ok({ items: categoryTiles() }));

route('GET', '/home', () => {
  const ps = db().paintings;
  const hero = ps.find((p) => p.heroOfDay) || ps[0];
  const artist = artistBySlug('adaeze-nwosu') || db().artists[0];
  return ok({
    hero: toPainting(hero),
    categories: categoryTiles(),
    featured: ps.filter((p) => p.featured).slice(0, 8).map(toCard),
    trending: trending(6).map(toCard),
    featuredArtist: {
      artist: toArtistCard(artist),
      bio: artist.bio.split('\n\n')[0],
      paintings: ps.filter((p) => p.artistSlug === artist.slug).slice(0, 3).map(toCard),
    },
    collections: [...db().collections].sort((a, b) => a.order - b.order).slice(0, 3).map(toCollectionCard),
    searchSuggestions: ['calm landscapes', 'abstract with warm colours', 'religious paintings on wood panel'],
  });
});


route('GET', '/paintings', ({ query }) => {
  const { items, counts } = filterPaintings(query);
  return ok({ ...paginate(items.map(toCard), query), counts });
});

route('GET', '/paintings/trending', ({ query }) => ok({ items: trending(Number(query.limit) || 6).map(toCard) }));

function findPainting(slug) {
  const painting = paintingBySlug(decodeURIComponent(slug));
  if (!painting) fail(404, 'We could not find that painting.', 'NOT_FOUND');
  return painting;
}

route('GET', '/paintings/:slug', ({ params }) => ok({ painting: toPainting(findPainting(params.slug)) }));

route('GET', '/paintings/:slug/similar', ({ params, query }) =>
  ok({ items: similarTo(findPainting(params.slug), Number(query.limit) || 4).map(toCard) }));

route('GET', '/paintings/:slug/moreByArtist', ({ params, query }) => {
  const painting = findPainting(params.slug);
  const items = sortPaintings(db().paintings.filter((p) => p.artistSlug === painting.artistSlug && p.slug !== painting.slug), 'newest');
  return ok({ items: items.slice(0, Number(query.limit) || 4).map(toCard) });
});

route('POST', '/paintings/:slug/view', ({ params }) => {
  const painting = findPainting(params.slug);
  const user = currentUser();
  const visitor = user ? '' : visitorId();
  const recent = db().views.find((v) => v.slug === painting.slug && (user ? v.userId === user.id : v.visitorId === visitor)
    && Date.now() - new Date(v.at).getTime() < 30 * 60 * 1000);
  if (!recent) {
    db().views.push({ slug: painting.slug, userId: user?.id || null, visitorId: visitor, at: now() });
    save();
  }
  return noContent();
});

route('GET', '/paintings/:slug/download', ({ params, query }) => {
  const painting = toPainting(findPainting(params.slug));
  const blocks = paintingBlocks(painting);
  return ok(query.format === 'docx' ? makeDocx(blocks) : makePdf(blocks));
});


const surname = (name) => name.split(' ').slice(-1)[0];

route('GET', '/artists', ({ query }) => {
  let items = [...db().artists];
  if (query.q) items = items.filter((a) => a.name.toLowerCase().includes(String(query.q).toLowerCase()));
  if (query.letter && query.letter !== 'all') items = items.filter((a) => surname(a.name).toUpperCase().startsWith(String(query.letter).toUpperCase()));
  return ok({ items: items.map(toArtistCard), total: items.length });
});

route('GET', '/artists/:slug', ({ params }) => {
  const artist = artistBySlug(decodeURIComponent(params.slug));
  if (!artist) fail(404, 'We could not find that artist.', 'NOT_FOUND');
  const theirs = db().paintings.filter((p) => p.artistSlug === artist.slug);
  const categories = new Set(theirs.map((p) => p.category));
  const similar = db().artists
    .filter((a) => a.slug !== artist.slug)
    .map((a) => {
      const others = db().paintings.filter((p) => p.artistSlug === a.slug);
      const score = others.filter((p) => categories.has(p.category)).length + a.styles.filter((s) => artist.styles.includes(s)).length * 2;
      return { a, score };
    })
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score)
    .slice(0, 4)
    .map((x) => toArtistCard(x.a));
  return ok({ artist: { ...toArtistCard(artist), bio: artist.bio }, paintings: sortPaintings(theirs, 'newest').map(toCard), similar });
});


route('GET', '/collections', () => ok({ items: [...db().collections].sort((a, b) => a.order - b.order).map(toCollectionCard) }));

route('GET', '/collections/:slug', ({ params }) => {
  const collection = db().collections.find((c) => c.slug === decodeURIComponent(params.slug));
  if (!collection) fail(404, 'We could not find that collection.', 'NOT_FOUND');
  return ok({
    collection: { ...toCollectionCard(collection), description: collection.description },
    paintings: collection.paintings.map(paintingBySlug).filter(Boolean).map(toCard),
  });
});


route('GET', '/search', ({ query }) => {
  const q = String(query.q || '').trim().slice(0, 200);
  if (!q) validationError({ q: 'Type what you would like to see.' });
  const excluded = list(query.exclude);
  const understood = understand(q).filter((chip) => !excluded.includes(chip.key));
  let items = runSearch(understood);
  if (query.sort === 'newest' || query.sort === 'oldest') items = sortPaintings(items, query.sort);
  if (!excluded.length) {
    db().searches.push({ query: q, userId: currentUser()?.id || null, at: now() });
    save();
  }
  return ok({ query: q, understood, ...paginate(items.map(toCard), query) });
});


route('POST', '/identify', async ({ body }) => {
  const file = field(body, 'image');
  if (!file) validationError({ image: 'Choose an image first.' });
  if (file.size > 5 * 1024 * 1024) fail(413, 'That image is over 5 MB. Please choose a smaller one.', 'TOO_LARGE');
  if (file.type && !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) validationError({ image: 'Please choose a JPG, PNG or WEBP image.' });

  const read = await readPalette(file);
  const palette = read?.palette || ['#5C7A6B', '#A7B8A0', '#D9C9A3', '#7E6A4F', '#3E4A52', '#C8B59A'];
  const ranked = db().paintings
    .map((p) => {
      const tones = p.palette.length ? p.palette : p.tones;
      const distance = palette.reduce((sum, colour) => sum + Math.min(...tones.map((t) => colourDistance(colour, t))), 0) / palette.length;
      const shapeBonus = read && read.orientation === p.orientation ? 4 : 0;
      return { p, score: distance - shapeBonus };
    })
    .sort((a, b) => a.score - b.score)
    .map((x) => x.p);

  const top = ranked.slice(0, 6);
  const vote = (read2) => {
    const counts = {};
    for (const p of top) counts[read2(p)] = (counts[read2(p)] || 0) + 1;
    const [value, count] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return { value, confidence: count >= 3 ? 'likely' : 'possible' };
  };
  const style = vote((p) => p.style);
  const category = vote((p) => p.category);
  const mood = vote((p) => p.mood);
  const medium = vote((p) => p.medium);

  const notes = [];
  if (read) {
    notes.push(read.warmth > 0.55 ? 'Mostly warm colours' : read.warmth < 0.3 ? 'Mostly cool colours' : 'Warm light against cool shadow');
    notes.push(read.saturation > 0.45 ? 'Strong, saturated colour' : 'Soft, muted colour');
    notes.push(read.brightness > 0.62 ? 'Light and airy overall' : read.brightness < 0.4 ? 'Deep, dark tones' : 'Even balance of light and dark');
  } else {
    notes.push('Short broken brush strokes', 'Warm light against cool shadow', 'Low horizon with a wide sky');
  }

  return ok({
    fileName: file.name || 'image.jpg',
    findings: { style, category, mood, medium, palette, notes },
    similar: ranked.slice(0, 4).map(toCard),
    searchQuery: `${mood.value} ${style.value} ${category.value}`.toLowerCase(),
  });
});


route('GET', '/recommendations', ({ query }) => ok({ items: recommend(requireUser(), Number(query.limit) || 8) }));

route('GET', '/me/insights', () => {
  const data = insights(requireUser());
  save();
  return ok(data);
});

route('POST', '/me/insights/taste', () => {
  const user = requireUser();
  user.tasteVariant = (user.tasteVariant || 0) + 1;
  user.tasteSummary = tasteText(user, user.tasteVariant);
  save();
  return ok({ taste: user.tasteSummary });
});


const myFavourites = (user) => db().favourites.filter((f) => f.userId === user.id);

route('GET', '/favourites', ({ query }) => {
  const user = requireUser();
  let items = myFavourites(user).map((f) => ({ painting: toCard(paintingBySlug(f.slug)), savedAt: f.savedAt })).filter((x) => x.painting);
  if (query.sort === 'title') items.sort((a, b) => a.painting.title.localeCompare(b.painting.title));
  else if (query.sort === 'artist') items.sort((a, b) => a.painting.artist.name.localeCompare(b.painting.artist.name));
  else items.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
  return ok({ items, total: items.length });
});

route('GET', '/favourites/ids', () => ok({ slugs: myFavourites(requireUser()).map((f) => f.slug) }));

route('POST', '/favourites', ({ body }) => {
  const user = requireUser();
  const painting = findPainting(body.slug || '');
  let entry = myFavourites(user).find((f) => f.slug === painting.slug);
  if (!entry) {
    entry = { userId: user.id, slug: painting.slug, savedAt: now() };
    db().favourites.push(entry);
    save();
  }
  return ok({ slug: painting.slug, savedAt: entry.savedAt, count: myFavourites(user).length }, 201);
});

route('DELETE', '/favourites/:slug', ({ params }) => {
  const user = requireUser();
  const slug = decodeURIComponent(params.slug);
  db().favourites = db().favourites.filter((f) => !(f.userId === user.id && f.slug === slug));
  save();
  return ok({ slug, count: myFavourites(user).length });
});

route('GET', '/favourites/export', () => {
  const user = requireUser();
  const paintings = myFavourites(user).map((f) => paintingBySlug(f.slug)).filter(Boolean).map(toPainting);
  const blocks = [
    { text: 'ArtMind', size: 10, bold: true },
    { text: `${user.name}'s favourites`, size: 22, bold: true, gap: 16 },
    { text: `${paintings.length} paintings, exported ${new Date().toLocaleDateString('en-GB')}`, size: 11, gap: 4 },
    ...paintings.flatMap((p) => [
      { text: p.title, size: 14, bold: true, gap: 18 },
      { text: `${p.artist.name}, ${p.year}. ${p.category}, ${p.style}. ${p.medium} on ${p.surface.toLowerCase()}, ${p.widthCm} x ${p.heightCm} cm.`, size: 10, gap: 2 },
      { text: p.summary, size: 10 },
    ]),
  ];
  return ok(makePdf(blocks));
});


route('GET', '/assistant/suggestions', () => ok({ items: SUGGESTIONS }));

route('POST', '/assistant/messages', ({ body }) => {
  const message = String(body.message || '').trim();
  if (!message) validationError({ message: 'Type a question first.' });
  if (message.length > 1000) validationError({ message: 'Please keep it under 1000 characters.' });
  const user = currentUser();
  const context = body.context || {};

  let conversation = null;
  if (user) {
    conversation = db().conversations.find((c) => c.id === body.conversationId && c.userId === user.id);
    if (!conversation) {
      conversation = { id: newId('v'), userId: user.id, title: titleFor(message), context, messages: [], updatedAt: now() };
      db().conversations.push(conversation);
    }
  }

  const previous = conversation ? conversation.messages : (body.history || []);
  const lastAssistant = [...previous].reverse().find((m) => m.role === 'assistant' && m.paintings?.length);
  const lastSlugs = lastAssistant ? lastAssistant.paintings.map((p) => (typeof p === 'string' ? p : p.slug)) : [];
  const answer = reply(message, { context, lastSlugs });
  const replyMessage = { id: newId('m'), role: 'assistant', text: answer.text, paintings: answer.paintings, followUps: answer.followUps, createdAt: now() };

  if (conversation) {
    conversation.messages.push({ id: newId('m'), role: 'user', text: message, paintings: [], followUps: [], createdAt: now() });
    conversation.messages.push({ ...replyMessage, paintings: answer.paintings.map((p) => p.slug) });
    conversation.updatedAt = now();
    save();
  }
  return ok({ conversationId: conversation?.id || null, reply: replyMessage });
});

route('GET', '/assistant/conversations', () => {
  const user = requireUser();
  const items = db().conversations.filter((c) => c.userId === user.id)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .map((c) => ({ id: c.id, title: c.title, updatedAt: c.updatedAt }));
  return ok({ items });
});

function myConversation(id) {
  const user = requireUser();
  const conversation = db().conversations.find((c) => c.id === id && c.userId === user.id);
  if (!conversation) fail(404, 'We could not find that conversation.', 'NOT_FOUND');
  return conversation;
}

route('GET', '/assistant/conversations/:id', ({ params }) => {
  const c = myConversation(params.id);
  return ok({
    conversation: {
      id: c.id,
      title: c.title,
      messages: c.messages.map((m) => ({ ...m, paintings: (m.paintings || []).map(paintingBySlug).filter(Boolean).map(toCard) })),
    },
  });
});

route('DELETE', '/assistant/conversations/:id', ({ params }) => {
  const c = myConversation(params.id);
  db().conversations = db().conversations.filter((x) => x !== c);
  save();
  return noContent();
});


route('PATCH', '/me', ({ body }) => {
  const user = requireUser();
  const fields = {};
  if (body.name !== undefined && String(body.name).trim().length < 2) fields.name = 'Enter your full name.';
  if (body.bio !== undefined && String(body.bio).length > 300) fields.bio = 'Keep your bio under 300 characters.';
  if (Object.keys(fields).length) validationError(fields);
  for (const key of ['name', 'bio', 'country']) if (body[key] !== undefined) user[key] = String(body[key]).trim();
  save();
  return ok({ user: publicUser(user) });
});

route('POST', '/me/photo', async ({ body }) => {
  const user = requireUser();
  const file = field(body, 'photo');
  if (!file) validationError({ photo: 'Choose a photo first.' });
  if (file.size > 2 * 1024 * 1024) fail(413, 'That photo is over 2 MB. Please choose a smaller one.', 'TOO_LARGE');
  user.avatar = (await shrinkToDataUrl(file, 240)) || user.avatar;
  save();
  return ok({ user: publicUser(user) });
});

route('PUT', '/me/interests', ({ body }) => {
  const user = requireUser();
  const interests = Array.isArray(body.interests) ? body.interests.filter((c) => CATEGORIES.includes(c)) : [];
  if (!interests.length) validationError({ interests: 'Pick at least one category.' });
  user.interests = [...new Set(interests)];
  user.tasteSummary = '';
  save();
  return ok({ user: publicUser(user) });
});

route('PUT', '/me/password', ({ body }) => {
  const user = requireUser();
  if (user.password && body.currentPassword !== user.password) validationError({ currentPassword: 'Your current password is not right.' });
  checkPassword(body.newPassword, 'newPassword');
  user.password = body.newPassword;
  save();
  return ok({ message: 'Password changed.' });
});

route('DELETE', '/me/sessions', () => {
  requireUser();
  return ok({ signedOut: 0 });
});

route('GET', '/me/export', () => {
  const user = requireUser();
  const state = db();
  return ok(jsonBlob({
    profile: publicUser(user),
    favourites: state.favourites.filter((f) => f.userId === user.id),
    views: state.views.filter((v) => v.userId === user.id),
    searches: state.searches.filter((s) => s.userId === user.id),
    conversations: state.conversations.filter((c) => c.userId === user.id),
    messages: state.messages.filter((m) => m.email === user.email),
    exportedAt: now(),
  }));
});

route('DELETE', '/me', ({ body }) => {
  const user = requireUser();
  if (user.password && body?.password !== user.password) validationError({ password: 'That password is not right.' });
  const state = db();
  if (user.role === 'admin' && state.users.filter((u) => u.role === 'admin').length === 1) {
    fail(409, 'You are the last admin. Make someone else an admin first.', 'CONFLICT');
  }
  state.users = state.users.filter((u) => u.id !== user.id);
  state.favourites = state.favourites.filter((f) => f.userId !== user.id);
  state.conversations = state.conversations.filter((c) => c.userId !== user.id);
  state.views = state.views.filter((v) => v.userId !== user.id);
  state.searches = state.searches.filter((s) => s.userId !== user.id);
  state.registrations = state.registrations.filter((r) => r.userId !== user.id);
  state.sessionUserId = null;
  save();
  return noContent();
});


route('POST', '/contact', ({ body }) => {
  const fields = {};
  if (!String(body.name || '').trim()) fields.name = 'Enter your name.';
  if (!isEmail(body.email || '')) fields.email = 'Enter a valid email address.';
  if (!CONTACT_SUBJECTS.includes(body.subject)) fields.subject = 'Choose a subject.';
  const message = String(body.message || '').trim();
  if (message.length < 10) fields.message = 'Write at least 10 characters.';
  if (message.length > 2000) fields.message = 'Keep it under 2000 characters.';
  if (Object.keys(fields).length) validationError(fields);
  db().messages.push({
    id: newId('g'), name: body.name.trim(), email: body.email.trim().toLowerCase(), subject: body.subject, message, status: 'new', createdAt: now(),
  });
  save();
  return ok({ message: 'Thank you. We will reply within two working days.' }, 201);
});


route('GET', '/admin/overview', ({ query }) => {
  requireAdmin();
  const days = [7, 30, 90].includes(Number(query.days)) ? Number(query.days) : 30;
  return ok(overview(days));
});

function adminRow(p) {
  return { ...toCard(p), views: viewCount(p.slug), saves: saveCount(p.slug) };
}

function findById(collection, id, label) {
  const item = db()[collection].find((x) => x.id === id);
  if (!item) fail(404, `We could not find that ${label}.`, 'NOT_FOUND');
  return item;
}

route('GET', '/admin/paintings', ({ query }) => {
  requireAdmin();
  let items = sortPaintings(db().paintings, 'popular');
  if (query.q) {
    const q = String(query.q).toLowerCase();
    items = items.filter((p) => p.title.toLowerCase().includes(q) || (artistBySlug(p.artistSlug)?.name || '').toLowerCase().includes(q));
  }
  if (query.category) items = items.filter((p) => p.category === query.category);
  return ok(paginate(items.map(adminRow), query));
});

route('GET', '/admin/paintings/:id', ({ params }) => {
  requireAdmin();
  const p = findById('paintings', params.id, 'painting');
  return ok({ painting: { ...toPainting(p), artistSlug: p.artistSlug } });
});

async function readPaintingForm(body, existing) {
  const get = (key) => field(body, key);
  const values = {};
  for (const key of ['title', 'artistSlug', 'category', 'style', 'medium', 'surface', 'mood', 'description', 'summary']) {
    const value = get(key);
    if (value !== undefined) values[key] = String(value).trim();
  }
  for (const key of ['year', 'widthCm', 'heightCm']) {
    const value = get(key);
    if (value !== undefined && value !== '') values[key] = Number(value);
  }
  const featured = get('featured');
  if (featured !== undefined) values.featured = String(featured) === 'true';
  const tags = jsonField(body, 'tags');
  if (tags !== undefined) values.tags = tags;
  const palette = jsonField(body, 'palette');
  if (palette !== undefined) values.palette = palette;

  const merged = { ...existing, ...values };
  const fields = {};
  if (!merged.title) fields.title = 'Enter a title.';
  if (!artistBySlug(merged.artistSlug)) fields.artistSlug = 'Choose an artist.';
  if (!CATEGORIES.includes(merged.category)) fields.category = 'Choose a category.';
  if (!merged.style) fields.style = 'Choose a style.';
  if (!merged.medium) fields.medium = 'Choose a medium.';
  if (!merged.surface) fields.surface = 'Choose a surface.';
  if (!merged.year || merged.year < 1000 || merged.year > new Date().getFullYear()) fields.year = 'Enter a year.';
  if (!merged.widthCm) fields.widthCm = 'Enter the width.';
  if (!merged.heightCm) fields.heightCm = 'Enter the height.';

  const image = get('image');
  if (image && typeof image !== 'string') {
    if (image.size > 8 * 1024 * 1024) fail(413, 'That image is over 8 MB.', 'TOO_LARGE');
    const dataUrl = await shrinkToDataUrl(image, 900);
    if (dataUrl) merged.image = dataUrl;
    const read = await readPalette(image);
    if (read && !merged.tones?.length) merged.tones = read.palette.slice(0, 3);
  }
  if (!merged.image) fields.image = 'Add an image.';
  if (Object.keys(fields).length) validationError(fields);

  merged.orientation = merged.widthCm === merged.heightCm ? 'square' : merged.widthCm > merged.heightCm ? 'landscape' : 'portrait';
  merged.tags = merged.tags || [];
  merged.palette = merged.palette || [];
  merged.tones = merged.tones?.length ? merged.tones : merged.palette.slice(0, 3);
  merged.colourGroups = merged.colourGroups || [];
  return merged;
}

route('POST', '/admin/paintings', async ({ body }) => {
  requireAdmin();
  const painting = await readPaintingForm(body, {});
  let slug = lettersOnly(painting.title);
  while (paintingBySlug(slug)) slug = `${slug}-2`;
  const next = db().paintings.length + 1;
  Object.assign(painting, { id: newId('p'), code: `P${next}`, slug, heroOfDay: false, colours: '', createdAt: now() });
  db().paintings.push(painting);
  save();
  return ok({ painting: toPainting(painting) }, 201);
});

route('PUT', '/admin/paintings/:id', async ({ params, body }) => {
  requireAdmin();
  const existing = findById('paintings', params.id, 'painting');
  const updated = await readPaintingForm(body, existing);
  Object.assign(existing, updated);
  save();
  return ok({ painting: toPainting(existing) });
});

route('DELETE', '/admin/paintings/:id', ({ params }) => {
  requireAdmin();
  const p = findById('paintings', params.id, 'painting');
  const state = db();
  state.paintings = state.paintings.filter((x) => x !== p);
  state.favourites = state.favourites.filter((f) => f.slug !== p.slug);
  for (const c of state.collections) c.paintings = c.paintings.filter((s) => s !== p.slug);
  save();
  return noContent();
});

route('PATCH', '/admin/paintings/:id/featured', ({ params, body }) => {
  requireAdmin();
  const p = findById('paintings', params.id, 'painting');
  p.featured = Boolean(body.featured);
  save();
  return ok({ painting: toCard(p) });
});

route('POST', '/admin/paintings/generate', async ({ body }) => {
  requireAdmin();
  const id = field(body, 'id');
  const image = field(body, 'image');
  let palette;
  let base;
  if (id) {
    base = findById('paintings', id, 'painting');
    palette = base.palette.length ? base.palette : base.tones;
  } else if (image) {
    palette = (await readPalette(image))?.palette;
  } else {
    validationError({ image: 'Add an image first.' });
  }
  palette = palette?.length ? palette : ['#C99A3A', '#A33A2C', '#1F2433', '#E2D8C4', '#9A5A3A', '#E6C68A'];
  if (!base) {
    base = db().paintings
      .map((p) => ({ p, d: palette.reduce((s, c) => s + Math.min(...p.tones.map((t) => colourDistance(c, t))), 0) }))
      .sort((a, b) => a.d - b.d)[0].p;
  }
  const similar = similarTo(base, 3);
  const tags = [...new Set([...base.tags.slice(0, 4), ...similar.flatMap((p) => p.tags.slice(0, 1))])].slice(0, 6);
  return ok({
    style: base.style,
    category: base.category,
    mood: base.mood,
    tags,
    summary: `A ${base.mood.toLowerCase()} ${base.style.toLowerCase()} painting with ${base.colours || 'a carefully balanced palette'}.`,
    palette: palette.slice(0, 6),
  });
});

route('GET', '/admin/artists', ({ query }) => {
  requireAdmin();
  let items = [...db().artists].sort((a, b) => a.name.localeCompare(b.name));
  if (query.q) items = items.filter((a) => a.name.toLowerCase().includes(String(query.q).toLowerCase()));
  return ok({ items: items.map((a) => ({ ...toArtistCard(a), bio: a.bio })) });
});

async function readArtistForm(body, existing) {
  const merged = { ...existing };
  for (const key of ['name', 'country', 'bio']) {
    const value = field(body, key);
    if (value !== undefined) merged[key] = String(value).trim();
  }
  const born = field(body, 'bornYear');
  if (born !== undefined && born !== '') merged.bornYear = Number(born);
  const styles = jsonField(body, 'styles');
  if (styles !== undefined) merged.styles = styles;
  const fields = {};
  if (!merged.name || merged.name.length < 2) fields.name = 'Enter a name.';
  if (!merged.country) fields.country = 'Choose a country.';
  if (!merged.bornYear || merged.bornYear < 1800 || merged.bornYear > new Date().getFullYear()) fields.bornYear = 'Enter a birth year.';
  if (Object.keys(fields).length) validationError(fields);
  const photo = field(body, 'photo');
  if (photo && typeof photo !== 'string') merged.portrait = (await shrinkToDataUrl(photo, 400)) || merged.portrait;
  merged.styles = merged.styles || [];
  return merged;
}

route('POST', '/admin/artists', async ({ body }) => {
  requireAdmin();
  const artist = await readArtistForm(body, { bio: '', portrait: '' });
  let slug = lettersOnly(artist.name);
  while (artistBySlug(slug)) slug = `${slug}-2`;
  Object.assign(artist, { id: newId('a'), slug, portrait: artist.portrait || `/images/artists/${slug}.jpg` });
  db().artists.push(artist);
  save();
  return ok({ artist: toArtistCard(artist) }, 201);
});

route('PUT', '/admin/artists/:id', async ({ params, body }) => {
  requireAdmin();
  const existing = findById('artists', params.id, 'artist');
  Object.assign(existing, await readArtistForm(body, existing));
  save();
  return ok({ artist: toArtistCard(existing) });
});

route('DELETE', '/admin/artists/:id', ({ params }) => {
  requireAdmin();
  const artist = findById('artists', params.id, 'artist');
  if (db().paintings.some((p) => p.artistSlug === artist.slug)) {
    fail(409, 'This artist still has paintings. Move or delete them first.', 'CONFLICT');
  }
  db().artists = db().artists.filter((a) => a !== artist);
  save();
  return noContent();
});

const adminCollection = (c) => ({ ...toCollectionCard(c), description: c.description, order: c.order, paintings: c.paintings });

route('GET', '/admin/collections', () => {
  requireAdmin();
  return ok({ items: [...db().collections].sort((a, b) => a.order - b.order).map(adminCollection) });
});

function readCollection(body, existing) {
  const merged = { ...existing };
  for (const key of ['title', 'shortLine', 'description']) if (body[key] !== undefined) merged[key] = String(body[key]).trim();
  if (body.order !== undefined) merged.order = Number(body.order) || 0;
  if (body.paintings !== undefined) merged.paintings = (Array.isArray(body.paintings) ? body.paintings : []).filter((s) => paintingBySlug(s));
  const fields = {};
  if (!merged.title) fields.title = 'Enter a title.';
  if (!merged.paintings?.length) fields.paintings = 'Choose at least one painting.';
  if (Object.keys(fields).length) validationError(fields);
  return merged;
}

route('POST', '/admin/collections', ({ body }) => {
  requireAdmin();
  const c = readCollection(body, { shortLine: '', description: '', order: db().collections.length + 1, paintings: [] });
  let slug = lettersOnly(c.title).replace(/-/g, '_');
  while (db().collections.some((x) => x.slug === slug)) slug = `${slug}_2`;
  Object.assign(c, { id: newId('c'), slug });
  db().collections.push(c);
  save();
  return ok({ collection: adminCollection(c) }, 201);
});

route('PUT', '/admin/collections/:id', ({ params, body }) => {
  requireAdmin();
  const existing = findById('collections', params.id, 'collection');
  Object.assign(existing, readCollection(body, existing));
  save();
  return ok({ collection: adminCollection(existing) });
});

route('DELETE', '/admin/collections/:id', ({ params }) => {
  requireAdmin();
  const c = findById('collections', params.id, 'collection');
  db().collections = db().collections.filter((x) => x !== c);
  save();
  return noContent();
});

const adminUser = (u) => ({
  id: u.id, name: u.name, email: u.email, avatar: u.avatar, verified: u.verified, role: u.role, active: u.active,
  joinedAt: u.joinedAt, lastActiveAt: u.lastActiveAt,
});

route('GET', '/admin/users', ({ query }) => {
  requireAdmin();
  let items = [...db().users].sort((a, b) => new Date(b.joinedAt) - new Date(a.joinedAt));
  if (query.q) {
    const q = String(query.q).toLowerCase();
    items = items.filter((u) => u.name.toLowerCase().includes(q) || u.email.includes(q));
  }
  return ok(paginate(items.map(adminUser), query));
});

route('PATCH', '/admin/users/:id/role', ({ params, body }) => {
  const me = requireAdmin();
  const user = findById('users', params.id, 'user');
  if (user.id === me.id) fail(400, 'You cannot change your own role.', 'VALIDATION');
  if (!['user', 'admin'].includes(body.role)) validationError({ role: 'Choose user or admin.' });
  user.role = body.role;
  save();
  return ok({ user: adminUser(user) });
});

route('PATCH', '/admin/users/:id/active', ({ params, body }) => {
  const me = requireAdmin();
  const user = findById('users', params.id, 'user');
  if (user.id === me.id) fail(400, 'You cannot deactivate yourself.', 'VALIDATION');
  user.active = Boolean(body.active);
  save();
  return ok({ user: adminUser(user) });
});

route('GET', '/admin/messages', ({ query }) => {
  requireAdmin();
  const all = [...db().messages].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const counts = { new: 0, read: 0, replied: 0 };
  for (const m of all) counts[m.status] += 1;
  const items = query.status ? all.filter((m) => m.status === query.status) : all;
  return ok({ items, counts });
});

route('PATCH', '/admin/messages/:id', ({ params, body }) => {
  requireAdmin();
  const message = findById('messages', params.id, 'message');
  if (!['new', 'read', 'replied'].includes(body.status)) validationError({ status: 'Choose new, read or replied.' });
  message.status = body.status;
  save();
  return ok({ message });
});


export async function handle({ method, path, query = {}, body }) {
  await wait();
  const cleanPath = path.split('?')[0].replace(/\/$/, '') || '/';
  const candidates = routes.filter((r) => r.regex.test(cleanPath));
  const match = candidates.find((r) => r.method === method);
  if (!match) {
    return {
      status: candidates.length ? 405 : 404,
      data: { error: { message: `There is no API route for ${method} /api${cleanPath}.`, code: 'NOT_FOUND' } },
    };
  }
  const values = cleanPath.match(match.regex).slice(1);
  const params = Object.fromEntries(match.keys.map((key, i) => [key, values[i]]));
  try {
    return await match.handler({ params, query, body: body ?? {} });
  } catch (err) {
    if (err instanceof MockError) {
      return { status: err.status, data: { error: { message: err.message, code: err.code, ...(err.fields ? { fields: err.fields } : {}) } } };
    }
    console.error('[mock]', err);
    return { status: 500, data: { error: { message: 'Something went wrong in the mock adapter.', code: 'SERVER_ERROR' } } };
  }
}

if (typeof window !== 'undefined') {
  window.artmindMock = { reset: resetMockData, state: db };
}

