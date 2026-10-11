import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config/env.js';
import { isDbConnected } from '../config/db.js';
import { CATEGORIES, CATEGORY_IMAGES, COLOUR_GROUPS, MEDIUMS, MOODS, SEARCH_SUGGESTIONS, STYLES, SURFACES } from '../config/constants.js';
import { Artist, Collection, Faq, Painting, ViewEvent } from '../models/index.js';
import { trendingPaintings } from '../services/analytics/trending.js';
import {
  ARTIST_FIELDS, artistCards, collectionCards, findCards, fullPainting, toArtistCard, toCard, worksCounts,
} from '../services/catalogue/index.js';
import { similarTo } from '../services/recommendations/index.js';
import { ApiError } from '../utils/ApiError.js';
import { escapeRegex, paginate, splitList } from '../validators/common.js';

const THIRTY_MINUTES = 30 * 60 * 1000;

export async function options(req, res) {
  let styles = STYLES;
  if (isDbConnected()) {
    const used = await Painting.distinct('style');
    styles = [...new Set([...STYLES, ...used])].sort();
  }
  res.json({ categories: CATEGORIES, styles, mediums: MEDIUMS, surfaces: SURFACES, moods: MOODS, colours: COLOUR_GROUPS });
}

export async function faq(req, res) {
  if (isDbConnected()) {
    const rows = await Faq.find({}).sort({ order: 1 }).lean();
    if (rows.length) return res.json({ items: rows.map((r) => ({ question: r.question, answer: r.answer })) });
  }
  const items = JSON.parse(await readFile(path.join(config.paths.seed, 'faq.json'), 'utf8'));
  res.json({ items });
}

async function categoryTiles() {
  const rows = await Painting.aggregate([{ $group: { _id: '$category', n: { $sum: 1 } } }]);
  const counts = new Map(rows.map((r) => [r._id, r.n]));
  return CATEGORIES.map((name) => ({ name, count: counts.get(name) || 0, image: CATEGORY_IMAGES[name] }));
}

export async function categories(req, res) {
  res.json({ items: await categoryTiles() });
}

export async function home(req, res) {
  const heroDoc = (await Painting.findOne({ heroOfDay: true }).lean()) || (await Painting.findOne({}).sort({ featured: -1, viewCount: -1 }).lean());
  const artist = (await Artist.findOne({ slug: 'adaeze-nwosu' }).lean()) || (await Artist.findOne({}).sort({ name: 1 }).lean());
  const [hero, tiles, featured, trending, collections, counts] = await Promise.all([
    heroDoc ? fullPainting({ _id: heroDoc._id }, req.user) : null,
    categoryTiles(),
    findCards({ featured: true }, { sort: { year: -1, title: 1 }, limit: 8 }),
    trendingPaintings(6),
    Collection.find({}).sort({ order: 1 }).limit(3).lean(),
    worksCounts(),
  ]);
  const artistPaintings = artist ? await findCards({ artist: artist._id }, { sort: { year: -1 }, limit: 3 }) : [];
  res.json({
    hero,
    categories: tiles,
    featured: featured.map(toCard),
    trending: trending.map(toCard),
    featuredArtist: artist
      ? { artist: toArtistCard(artist, counts.get(String(artist._id)) || 0), bio: (artist.bio || '').split('\n\n')[0], paintings: artistPaintings.map(toCard) }
      : null,
    collections: await collectionCards(collections),
    searchSuggestions: SEARCH_SUGGESTIONS,
  });
}

const FACETS = ['category', 'style', 'medium', 'surface', 'colour', 'mood'];

async function galleryMatch(query, skip) {
  const and = [];
  for (const facet of ['category', 'style', 'medium', 'surface', 'mood']) {
    const wanted = splitList(query[facet]);
    if (facet !== skip && wanted.length) and.push({ [facet]: { $in: wanted } });
  }
  const colours = [...splitList(query.colour), ...splitList(query.dominantColour)];
  if (skip !== 'colour' && colours.length) and.push({ $or: [{ colourGroups: { $in: colours } }, { dominantColour: { $in: colours } }] });
  if (query.artist) and.push({ artistSlug: query.artist });
  if (query.yearFrom) and.push({ year: { $gte: query.yearFrom } });
  if (query.yearTo) and.push({ year: { $lte: query.yearTo } });
  if (query.featured === 'true') and.push({ featured: true });
  if (query.q) {
    const pattern = new RegExp(escapeRegex(query.q), 'i');
    const artists = await Artist.find({ name: pattern }).select('_id').lean();
    and.push({ $or: [{ title: pattern }, { tags: pattern }, { artist: { $in: artists.map((a) => a._id) } }] });
  }
  return and.length ? { $and: and } : {};
}

const SORTS = {
  newest: { year: -1, title: 1 },
  oldest: { year: 1, title: 1 },
  title: { title: 1 },
  popular: { viewCount: -1, title: 1 },
};

export async function listPaintings(req, res) {
  const query = req.query;
  const full = await galleryMatch(query);
  const facetStages = {};
  for (const facet of FACETS) {
    const match = await galleryMatch(query, facet);
    const value = facet === 'colour'
      ? { $setUnion: [{ $ifNull: ['$colourGroups', []] }, { $cond: [{ $gt: [{ $strLenCP: { $ifNull: ['$dominantColour', ''] } }, 0] }, ['$dominantColour'], []] }] }
      : [`$${facet}`];
    facetStages[facet] = [{ $match: match }, { $project: { v: value } }, { $unwind: '$v' }, { $group: { _id: '$v', n: { $sum: 1 } } }];
  }
  facetStages.total = [{ $match: full }, { $count: 'n' }];
  const [facets] = await Painting.aggregate([{ $facet: facetStages }]);

  const counts = {};
  for (const facet of FACETS) counts[facet] = Object.fromEntries(facets[facet].filter((r) => r._id).map((r) => [r._id, r.n]));
  const total = facets.total[0]?.n || 0;
  const { page, limit, pages, skip } = paginate(total, query);
  const docs = await Painting.find(full)
    .sort(SORTS[query.sort] || SORTS.newest)
    .collation({ locale: 'en' })
    .skip(skip)
    .limit(limit)
    .populate('artist', ARTIST_FIELDS)
    .lean();
  res.json({ items: docs.map(toCard), page, limit, total, pages, counts });
}

export async function trending(req, res) {
  const items = await trendingPaintings(req.query.limit || 6);
  res.json({ items: items.map(toCard) });
}

async function paintingOr404(slug, select) {
  const painting = await Painting.findOne({ slug }).select(select || '').lean();
  if (!painting) throw ApiError.notFound('We could not find that painting.');
  return painting;
}

export async function painting(req, res) {
  const result = await fullPainting({ slug: req.params.slug }, req.user);
  if (!result) throw ApiError.notFound('We could not find that painting.');
  res.json({ painting: result });
}

export async function similar(req, res) {
  const source = await paintingOr404(req.params.slug, '+embedding');
  const items = await similarTo(source, req.query.limit || 4);
  res.json({ items: items.map(toCard) });
}

export async function moreByArtist(req, res) {
  const source = await paintingOr404(req.params.slug);
  const items = await findCards({ artist: source.artist, _id: { $ne: source._id } }, { sort: { year: -1, title: 1 }, limit: req.query.limit || 4 });
  res.json({ items: items.map(toCard) });
}

export async function recordView(req, res) {
  const source = await paintingOr404(req.params.slug, '_id category');
  const who = req.user ? { user: req.user._id } : { user: null, visitorId: req.guestId };
  const recent = await ViewEvent.exists({ painting: source._id, ...who, createdAt: { $gte: new Date(Date.now() - THIRTY_MINUTES) } });
  if (!recent) {
    await ViewEvent.create({ painting: source._id, user: req.user?._id || null, visitorId: req.guestId || '', category: source.category });
    await Painting.updateOne({ _id: source._id }, { $inc: { viewCount: 1 } });
  }
  res.status(204).end();
}

const surname = (name) => name.trim().split(/\s+/).slice(-1)[0];

export async function artists(req, res) {
  let items = await Artist.find({}).sort({ name: 1 }).collation({ locale: 'en' }).lean();
  if (req.query.q) items = items.filter((a) => a.name.toLowerCase().includes(req.query.q.toLowerCase()));
  if (req.query.letter && req.query.letter.toLowerCase() !== 'all') {
    items = items.filter((a) => surname(a.name).toUpperCase().startsWith(req.query.letter.toUpperCase()));
  }
  res.json({ items: await artistCards(items), total: items.length });
}

export async function artist(req, res) {
  const found = await Artist.findOne({ slug: req.params.slug }).lean();
  if (!found) throw ApiError.notFound('We could not find that artist.');
  const theirs = await findCards({ artist: found._id }, { sort: { year: -1, title: 1 } });
  const categories = new Set(theirs.map((p) => p.category));
  const others = await Artist.find({ _id: { $ne: found._id } }).lean();
  const otherPaintings = await Painting.find({ artist: { $ne: found._id } }).select('artist category').lean();
  const scored = others
    .map((a) => {
      const shared = otherPaintings.filter((p) => String(p.artist) === String(a._id) && categories.has(p.category)).length;
      const styles = (a.styles || []).filter((s) => (found.styles || []).includes(s)).length;
      return { a, score: shared + styles * 2 };
    })
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score || x.a.name.localeCompare(y.a.name))
    .slice(0, 4)
    .map((x) => x.a);
  const counts = await worksCounts();
  res.json({
    artist: { ...toArtistCard(found, theirs.length), bio: found.bio || '' },
    paintings: theirs.map(toCard),
    similar: scored.map((a) => toArtistCard(a, counts.get(String(a._id)) || 0)),
  });
}

export async function collections(req, res) {
  const rows = await Collection.find({}).sort({ order: 1 }).lean();
  res.json({ items: await collectionCards(rows) });
}

export async function collection(req, res) {
  const found = await Collection.findOne({ slug: req.params.slug }).lean();
  if (!found) throw ApiError.notFound('We could not find that collection.');
  const [card] = await collectionCards([found]);
  const docs = await findCards({ _id: { $in: found.paintings } });
  const byId = new Map(docs.map((d) => [String(d._id), d]));
  res.json({
    collection: { ...card, description: found.description || '' },
    paintings: found.paintings.map((id) => byId.get(String(id))).filter(Boolean).map(toCard),
  });
}
