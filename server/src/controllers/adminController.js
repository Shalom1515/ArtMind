import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { ensureFolder, findImage, storage } from '../config/storage.js';
import {
  Artist, Collection, ContactMessage, Favourite, Painting, User,
} from '../models/index.js';
import { overview as buildOverview } from '../services/analytics/index.js';
import { chatJson, isAvailable, TIMEOUTS } from '../services/assistant/modelClient.js';
import {
  ARTIST_FIELDS, artistCards, collectionCards, fullPainting, saveCounts, toArtistCard, toCard,
} from '../services/catalogue/index.js';
import { analyseImage, measuresOf } from '../services/palette/index.js';
import { embed, forgetPaintingVectors, recognise } from '../services/recognition/index.js';
import { forgetVocabulary } from '../services/search/index.js';
import { endAllSessions } from '../services/sessions/index.js';
import { ApiError } from '../utils/ApiError.js';
import { slugify, slugifyUnderscore } from '../utils/slugify.js';
import { parse } from '../middleware/validate.js';
import { escapeRegex, paginate } from '../validators/common.js';
import { artistSchema, artistUpdateSchema, collectionSchema, collectionUpdateSchema, paintingSchema, paintingUpdateSchema } from '../validators/admin.js';

const notFound = (label) => ApiError.notFound(`We could not find that ${label}.`);

export async function overview(req, res) {
  res.json(await buildOverview(req.query.days));
}

async function uniqueSlug(Model, base, joiner = '-') {
  let slug = base || 'untitled';
  let n = 2;
  while (await Model.exists({ slug })) slug = `${base}${joiner}${n++}`;
  return slug;
}

const SORTS = { popular: { viewCount: -1, title: 1 }, newest: { year: -1, title: 1 }, oldest: { year: 1, title: 1 }, title: { title: 1 } };

export async function listPaintings(req, res) {
  const filter = {};
  if (req.query.category) filter.category = req.query.category;
  if (req.query.q) {
    const pattern = new RegExp(escapeRegex(req.query.q), 'i');
    const artists = await Artist.find({ name: pattern }).select('_id').lean();
    filter.$or = [{ title: pattern }, { artist: { $in: artists.map((a) => a._id) } }];
  }
  const total = await Painting.countDocuments(filter);
  const { page, limit, pages, skip } = paginate(total, req.query);
  const docs = await Painting.find(filter).sort(SORTS[req.query.sort] || SORTS.popular).collation({ locale: 'en' })
    .skip(skip).limit(limit).populate('artist', ARTIST_FIELDS).lean();
  const saves = await saveCounts(docs.map((d) => d._id));
  const items = docs.map((d) => ({ ...toCard(d), views: d.viewCount || 0, saves: saves.get(String(d._id)) || 0 }));
  res.json({ items, page, limit, total, pages });
}

export async function getPainting(req, res) {
  const doc = await Painting.findById(req.params.id).lean();
  if (!doc) throw notFound('painting');
  const painting = await fullPainting({ _id: doc._id });
  res.json({ painting: { ...painting, artistSlug: doc.artistSlug } });
}

async function saveImage(buffer, folder, slug, { square } = {}) {
  let pipeline = sharp(buffer).rotate();
  pipeline = square
    ? pipeline.resize(400, 400, { fit: 'cover', position: 'attention' })
    : pipeline.resize(1600, 1600, { fit: 'inside', withoutEnlargement: true });
  const data = await pipeline.flatten({ background: '#F8F5EF' }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  await writeFile(path.join(ensureFolder(folder), `${slug}.jpg`), data);
  return data;
}

async function applyImage(painting, buffer, formPalette) {
  let data;
  try {
    data = await saveImage(buffer, storage.paintings, painting.slug);
  } catch {
    throw ApiError.badRequest('We could not read that image.', { image: 'We could not read that image.' });
  }
  const analysis = await analyseImage(data);
  painting.image = `/images/paintings/${painting.slug}.jpg?v=${Date.now().toString(36)}`;
  painting.palette = formPalette?.length ? formPalette : analysis.palette;
  painting.tones = painting.palette.slice(0, 3);
  painting.dominantColour = analysis.dominantColour;
  painting.colourGroups = analysis.colourGroups;
  painting.measures = measuresOf(analysis.stats);
  const embedding = await embed(data);
  painting.embedding = embedding || undefined;
  if (!embedding) console.warn(`[admin] MobileNet is not ready, so ${painting.slug} was saved without an embedding.`);
}

async function artistFor(slug) {
  const artist = await Artist.findOne({ slug }).lean();
  if (!artist) throw ApiError.badRequest(undefined, { artistSlug: 'Choose an artist.' });
  return artist;
}

function afterCatalogueChange() {
  forgetVocabulary();
  forgetPaintingVectors();
}

export async function createPainting(req, res) {
  const fields = parse(paintingSchema, req.body);
  if (!req.file) throw ApiError.badRequest(undefined, { image: 'Add an image.' });
  const artist = await artistFor(fields.artistSlug);
  const last = await Painting.find({}).select('code').lean();
  const next = Math.max(0, ...last.map((p) => Number(String(p.code || '').replace(/\D/g, '')) || 0)) + 1;
  const slug = await uniqueSlug(Painting, slugify(fields.title));
  const painting = new Painting({
    ...fields,
    tags: fields.tags || [],
    code: `P${String(next).padStart(2, '0')}`,
    slug,
    artist: artist._id,
    artistSlug: artist.slug,
    featured: Boolean(fields.featured),
    heroOfDay: false,
    image: `/images/paintings/${slug}.jpg`,
  });
  await applyImage(painting, req.file.buffer, fields.palette);
  await painting.save();
  afterCatalogueChange();
  res.status(201).json({ painting: await fullPainting({ _id: painting._id }) });
}

export async function updatePainting(req, res) {
  const painting = await Painting.findById(req.params.id).select('+embedding');
  if (!painting) throw notFound('painting');
  const changes = parse(paintingUpdateSchema, req.body);
  const current = painting.toObject();
  const merged = parse(paintingSchema, {
    title: current.title, artistSlug: current.artistSlug, year: current.year, category: current.category, style: current.style,
    medium: current.medium, surface: current.surface, widthCm: current.widthCm, heightCm: current.heightCm, mood: current.mood,
    description: current.description, summary: current.summary, featured: current.featured, tags: current.tags, palette: current.palette,
    ...Object.fromEntries(Object.entries(changes).filter(([, v]) => v !== undefined)),
  });
  if (merged.artistSlug !== current.artistSlug) {
    const artist = await artistFor(merged.artistSlug);
    painting.artist = artist._id;
  }
  Object.assign(painting, merged);
  if (req.file) await applyImage(painting, req.file.buffer, changes.palette);
  else if (changes.palette?.length) painting.tones = changes.palette.slice(0, 3);
  await painting.save();
  afterCatalogueChange();
  res.json({ painting: await fullPainting({ _id: painting._id }) });
}

// Old views stay for the history charts. The image file is kept on disk.
export async function deletePainting(req, res) {
  const painting = await Painting.findById(req.params.id);
  if (!painting) throw notFound('painting');
  await Promise.all([
    Favourite.deleteMany({ painting: painting._id }),
    Collection.updateMany({ paintings: painting._id }, { $pull: { paintings: painting._id } }),
  ]);
  await painting.deleteOne();
  afterCatalogueChange();
  res.status(204).end();
}

export async function setFeatured(req, res) {
  const painting = await Painting.findByIdAndUpdate(req.params.id, { featured: req.body.featured }, { returnDocument: 'after' }).populate('artist', ARTIST_FIELDS).lean();
  if (!painting) throw notFound('painting');
  res.json({ painting: toCard(painting) });
}

function templateTags({ style, category, mood, medium, analysis, neighbours, title }) {
  const colourWords = { red: 'red', orange: 'orange', yellow: 'ochre', green: 'olive green', teal: 'teal', blue: 'deep blue', violet: 'violet', pink: 'pink', cream: 'cream', grey: 'grey', brown: 'earth tones', black: 'dark tones' };
  const fromNeighbours = neighbours.flatMap((p) => (p.tags || []).slice(0, 2));
  const titleWords = String(title || '').toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  return [...new Set([
    style.toLowerCase(), mood.toLowerCase(), ...(medium ? [medium.toLowerCase()] : []),
    ...analysis.colourGroups.slice(0, 2).map((c) => colourWords[c]),
    ...titleWords.slice(0, 2), category.toLowerCase(), ...fromNeighbours,
  ].filter(Boolean))].slice(0, 6);
}

function templateSummary({ style, mood, category, analysis, title }) {
  const colourWords = analysis.colourGroups.slice(0, 2).map((c) => ({ yellow: 'ochre', green: 'olive', blue: 'blue', violet: 'violet' }[c] || c));
  const subject = { Landscape: 'landscape', Flower: 'flower painting', Nature: 'study of nature', Abstract: 'abstract painting', Figurative: 'figure painting', Religious: 'religious scene' }[category] || 'painting';
  const light = analysis.stats.brightness > 0.6 ? 'light and open' : analysis.stats.brightness < 0.38 ? 'deep and shadowed' : 'evenly balanced';
  return `${title ? `${title} is a` : 'A'} ${mood.toLowerCase()} ${style.toLowerCase()} ${subject} in ${colourWords.join(' and ') || 'a quiet palette'}, ${light} in tone.`;
}

// Works on an image before anything is saved: TensorFlow prediction, sharp palette, then text from the model or templates.
export async function generate(req, res) {
  let buffer = req.file?.buffer;
  let base = null;
  if (!buffer && req.body.id) {
    base = await Painting.findById(req.body.id).lean();
    if (!base) throw notFound('painting');
    const file = findImage('paintings', base.slug);
    if (!file) throw ApiError.badRequest('This painting has no image yet. Upload one first.', { image: 'Upload an image first.' });
    buffer = await sharp(file).toBuffer();
  }
  if (!buffer) throw ApiError.badRequest(undefined, { image: 'Add an image first.' });

  let result;
  try {
    result = await recognise(buffer, { similarCount: 3 });
  } catch {
    throw ApiError.badRequest('We could not read that image.', { image: 'We could not read that image.' });
  }
  const neighbours = await Painting.find({ slug: { $in: result.similar.filter((s) => s !== base?.slug) } }).select('tags title').lean();
  const facts = {
    style: result.findings.style.value,
    category: result.findings.category.value,
    mood: result.findings.mood.value,
    medium: req.body.medium || base?.medium || result.findings.medium.value,
    title: req.body.title || base?.title || '',
    analysis: result.analysis,
    neighbours,
  };
  let tags = templateTags(facts);
  let summary = templateSummary(facts);

  if (isAvailable()) {
    const written = await chatJson([
      { role: 'system', content: 'You write catalogue text for a painting gallery. Use only the facts given. British spelling. Answer with JSON only: {"tags": ["5 or 6 short lower case tags"], "summary": "one or two plain sentences"}' },
      { role: 'user', content: JSON.stringify({
        title: facts.title, style: facts.style, category: facts.category, mood: facts.mood, medium: facts.medium, surface: req.body.surface || base?.surface,
        colours: result.analysis.colourGroups, notes: result.findings.notes, similarTags: neighbours.flatMap((p) => p.tags || []).slice(0, 10),
      }) },
    ], { timeoutMs: TIMEOUTS.writing });
    if (Array.isArray(written?.tags) && written.tags.length) tags = [...new Set(written.tags.map((t) => String(t).toLowerCase().trim().slice(0, 40)).filter(Boolean))].slice(0, 6);
    if (typeof written?.summary === 'string' && written.summary.trim()) summary = written.summary.trim().slice(0, 600);
  }

  res.json({ style: facts.style, category: facts.category, mood: facts.mood, tags, summary, palette: result.findings.palette });
}

export async function listArtists(req, res) {
  let items = await Artist.find({}).sort({ name: 1 }).collation({ locale: 'en' }).lean();
  if (req.query.q) items = items.filter((a) => a.name.toLowerCase().includes(String(req.query.q).toLowerCase()));
  const cards = await artistCards(items);
  res.json({ items: cards.map((card, i) => ({ ...card, bio: items[i].bio || '' })) });
}

async function artistResponse(artist) {
  const works = await Painting.countDocuments({ artist: artist._id });
  return toArtistCard(artist, works);
}

async function savePortrait(artist, file) {
  if (!file) return;
  try {
    await saveImage(file.buffer, storage.artists, artist.slug, { square: true });
  } catch {
    throw ApiError.badRequest('We could not read that photo.', { photo: 'We could not read that photo.' });
  }
  artist.portrait = `/images/artists/${artist.slug}.jpg?v=${Date.now().toString(36)}`;
}

export async function createArtist(req, res) {
  const fields = parse(artistSchema, req.body);
  const slug = await uniqueSlug(Artist, slugify(fields.name));
  const artist = new Artist({ ...fields, styles: fields.styles || [], bio: fields.bio || '', slug, portrait: `/images/artists/${slug}.jpg` });
  await savePortrait(artist, req.file);
  await artist.save();
  forgetVocabulary();
  res.status(201).json({ artist: await artistResponse(artist) });
}

export async function updateArtist(req, res) {
  const artist = await Artist.findById(req.params.id);
  if (!artist) throw notFound('artist');
  const changes = parse(artistUpdateSchema, req.body);
  const current = artist.toObject();
  const merged = parse(artistSchema, {
    name: current.name, country: current.country, bornYear: current.bornYear, bio: current.bio, styles: current.styles,
    ...Object.fromEntries(Object.entries(changes).filter(([, v]) => v !== undefined)),
  });
  Object.assign(artist, merged);
  await savePortrait(artist, req.file);
  await artist.save();
  forgetVocabulary();
  res.json({ artist: await artistResponse(artist) });
}

export async function deleteArtist(req, res) {
  const artist = await Artist.findById(req.params.id);
  if (!artist) throw notFound('artist');
  if (await Painting.exists({ artist: artist._id })) throw ApiError.conflict('This artist still has paintings. Move or delete them first.');
  await artist.deleteOne();
  forgetVocabulary();
  res.status(204).end();
}

async function adminCollection(c) {
  const [card] = await collectionCards([c]);
  const docs = await Painting.find({ _id: { $in: c.paintings } }).select('slug').lean();
  const slugs = new Map(docs.map((d) => [String(d._id), d.slug]));
  return { ...card, description: c.description || '', order: c.order, paintings: c.paintings.map((id) => slugs.get(String(id))).filter(Boolean) };
}

export async function listCollections(req, res) {
  const rows = await Collection.find({}).sort({ order: 1 }).lean();
  res.json({ items: await Promise.all(rows.map(adminCollection)) });
}

async function paintingIds(slugs) {
  const unique = [...new Set(slugs)];
  const docs = await Painting.find({ slug: { $in: unique } }).select('slug').lean();
  const bySlug = new Map(docs.map((d) => [d.slug, d._id]));
  const ids = unique.map((s) => bySlug.get(s)).filter(Boolean);
  if (ids.length < 4 || ids.length > 8) throw ApiError.badRequest(undefined, { paintings: 'Choose between four and eight paintings.' });
  return ids;
}

export async function createCollection(req, res) {
  const fields = parse(collectionSchema, req.body);
  const ids = await paintingIds(fields.paintings);
  const slug = await uniqueSlug(Collection, slugifyUnderscore(fields.title), '_');
  const order = fields.order ?? (await Collection.countDocuments()) + 1;
  const c = await Collection.create({ ...fields, slug, order, paintings: ids, shortLine: fields.shortLine || '', description: fields.description || '' });
  res.status(201).json({ collection: await adminCollection(c.toObject()) });
}

export async function updateCollection(req, res) {
  const c = await Collection.findById(req.params.id);
  if (!c) throw notFound('collection');
  const fields = parse(collectionUpdateSchema, req.body);
  for (const key of ['title', 'shortLine', 'description', 'order']) if (fields[key] !== undefined) c[key] = fields[key];
  if (fields.paintings !== undefined) c.paintings = await paintingIds(fields.paintings);
  await c.save();
  res.json({ collection: await adminCollection(c.toObject()) });
}

export async function deleteCollection(req, res) {
  const c = await Collection.findById(req.params.id);
  if (!c) throw notFound('collection');
  await c.deleteOne();
  res.status(204).end();
}

const adminUser = (u) => ({
  id: String(u._id), name: u.name, email: u.email, avatar: u.avatar || null, verified: u.verified, role: u.role, active: u.active,
  joinedAt: u.joinedAt, lastActiveAt: u.lastActiveAt,
});

export async function listUsers(req, res) {
  const filter = {};
  if (req.query.q) {
    const pattern = new RegExp(escapeRegex(req.query.q), 'i');
    filter.$or = [{ name: pattern }, { email: pattern }];
  }
  const total = await User.countDocuments(filter);
  const { page, limit, pages, skip } = paginate(total, req.query);
  const rows = await User.find(filter).sort({ joinedAt: -1 }).skip(skip).limit(limit).lean();
  res.json({ items: rows.map(adminUser), page, limit, total, pages });
}

async function otherUser(req, message) {
  const user = await User.findById(req.params.id);
  if (!user) throw notFound('user');
  if (String(user._id) === String(req.user._id)) throw ApiError.badRequest(message);
  return user;
}

export async function setRole(req, res) {
  const user = await otherUser(req, 'You cannot change your own role.');
  user.role = req.body.role;
  await user.save();
  res.json({ user: adminUser(user) });
}

export async function setActive(req, res) {
  const user = await otherUser(req, 'You cannot deactivate yourself.');
  user.active = req.body.active;
  await user.save();
  if (!user.active) await endAllSessions(user._id);
  res.json({ user: adminUser(user) });
}

const toMessage = (m) => ({ id: String(m._id), name: m.name, email: m.email, subject: m.subject, message: m.message, status: m.status, createdAt: m.createdAt });

export async function listMessages(req, res) {
  const [rows, grouped] = await Promise.all([
    ContactMessage.find(req.query.status ? { status: req.query.status } : {}).sort({ createdAt: -1 }).lean(),
    ContactMessage.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
  ]);
  const counts = { new: 0, read: 0, replied: 0 };
  for (const g of grouped) if (g._id in counts) counts[g._id] = g.n;
  res.json({ items: rows.map(toMessage), counts });
}

export async function setMessageStatus(req, res) {
  const message = await ContactMessage.findByIdAndUpdate(req.params.id, { status: req.body.status }, { returnDocument: 'after' }).lean();
  if (!message) throw notFound('message');
  res.json({ message: toMessage(message) });
}
