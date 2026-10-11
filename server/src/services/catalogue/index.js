import { Artist, Collection, Favourite, Painting } from '../../models/index.js';

export const ARTIST_FIELDS = 'slug name country bornYear portrait';

export function toCard(p) {
  if (!p) return null;
  const artist = p.artist && typeof p.artist === 'object' && p.artist.slug ? p.artist : null;
  return {
    id: String(p._id),
    slug: p.slug,
    title: p.title,
    artist: { slug: artist?.slug || p.artistSlug, name: artist?.name || '' },
    year: p.year,
    category: p.category,
    style: p.style,
    orientation: p.orientation,
    image: p.image,
    tones: p.tones?.length ? p.tones : (p.palette || []).slice(0, 3),
    featured: Boolean(p.featured),
  };
}

export function findCards(filter = {}, { sort, limit, skip } = {}) {
  let query = Painting.find(filter).populate('artist', ARTIST_FIELDS).lean();
  if (sort) query = query.sort(sort);
  if (skip) query = query.skip(skip);
  if (limit) query = query.limit(limit);
  return query;
}

// Loads paintings by slug or id and keeps the order asked for.
export async function cardsInOrder(keys, by = 'slug') {
  const list = keys.map(String).filter(Boolean);
  if (!list.length) return [];
  const docs = await findCards(by === 'slug' ? { slug: { $in: list } } : { _id: { $in: list } });
  const map = new Map(docs.map((d) => [by === 'slug' ? d.slug : String(d._id), d]));
  return list.map((key) => map.get(key)).filter(Boolean).map(toCard);
}

export async function saveCounts(ids) {
  const rows = await Favourite.aggregate([{ $match: { painting: { $in: ids } } }, { $group: { _id: '$painting', n: { $sum: 1 } } }]);
  return new Map(rows.map((r) => [String(r._id), r.n]));
}

export async function toPainting(p, user) {
  const [collections, saves, saved] = await Promise.all([
    Collection.find({ paintings: p._id }).sort({ order: 1 }).select('slug title').lean(),
    Favourite.countDocuments({ painting: p._id }),
    user ? Favourite.exists({ user: user._id, painting: p._id }) : null,
  ]);
  const artist = p.artist && p.artist.slug ? p.artist : await Artist.findById(p.artist).lean();
  return {
    ...toCard({ ...p, artist }),
    code: p.code,
    medium: p.medium,
    surface: p.surface,
    widthCm: p.widthCm,
    heightCm: p.heightCm,
    colours: p.colours || '',
    colourGroups: p.colourGroups || [],
    mood: p.mood,
    description: p.description || '',
    summary: p.summary || '',
    tags: p.tags || [],
    palette: p.palette || [],
    heroOfDay: Boolean(p.heroOfDay),
    artist: artist
      ? { slug: artist.slug, name: artist.name, country: artist.country, bornYear: artist.bornYear, portrait: artist.portrait }
      : { slug: p.artistSlug, name: '' },
    collections: collections.map((c) => ({ slug: c.slug, title: c.title })),
    views: p.viewCount || 0,
    saves,
    saved: Boolean(saved),
  };
}

export async function fullPainting(filter, user) {
  const p = await Painting.findOne(filter).populate('artist', ARTIST_FIELDS).lean();
  return p ? toPainting(p, user) : null;
}

export async function worksCounts() {
  const rows = await Painting.aggregate([{ $group: { _id: '$artist', n: { $sum: 1 } } }]);
  return new Map(rows.map((r) => [String(r._id), r.n]));
}

export function toArtistCard(a, works = 0) {
  return {
    id: String(a._id),
    slug: a.slug,
    name: a.name,
    country: a.country,
    bornYear: a.bornYear,
    styles: a.styles || [],
    portrait: a.portrait || `/images/artists/${a.slug}.jpg`,
    works,
  };
}

export async function artistCards(artists) {
  const counts = await worksCounts();
  return artists.map((a) => toArtistCard(a, counts.get(String(a._id)) || 0));
}

export async function collectionCards(collections) {
  const ids = [...new Set(collections.flatMap((c) => c.paintings.slice(0, 4).map(String)))];
  const docs = await findCards({ _id: { $in: ids } });
  const map = new Map(docs.map((d) => [String(d._id), toCard(d)]));
  return collections.map((c) => ({
    id: String(c._id),
    slug: c.slug,
    title: c.title,
    shortLine: c.shortLine || '',
    count: c.paintings.length,
    covers: c.paintings.slice(0, 4).map((id) => map.get(String(id))).filter(Boolean),
  }));
}
