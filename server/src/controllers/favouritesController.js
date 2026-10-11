import { Favourite, Painting } from '../models/index.js';
import { ARTIST_FIELDS, toCard } from '../services/catalogue/index.js';
import { favouritesPdf, sendFile, TYPES } from '../services/documents/index.js';
import { ApiError } from '../utils/ApiError.js';

async function myFavourites(user) {
  const rows = await Favourite.find({ user: user._id })
    .sort({ createdAt: -1 })
    .populate({ path: 'painting', populate: { path: 'artist', select: ARTIST_FIELDS } })
    .lean();
  return rows.filter((r) => r.painting);
}

export async function list(req, res) {
  let items = (await myFavourites(req.user)).map((r) => ({ painting: toCard(r.painting), savedAt: r.createdAt }));
  if (req.query.sort === 'title') items.sort((a, b) => a.painting.title.localeCompare(b.painting.title));
  else if (req.query.sort === 'artist') items.sort((a, b) => a.painting.artist.name.localeCompare(b.painting.artist.name) || a.painting.title.localeCompare(b.painting.title));
  res.json({ items, total: items.length });
}

export async function ids(req, res) {
  const rows = await Favourite.find({ user: req.user._id }).sort({ createdAt: -1 }).populate('painting', 'slug').lean();
  res.json({ slugs: rows.filter((r) => r.painting).map((r) => r.painting.slug) });
}

export async function add(req, res) {
  const painting = await Painting.findOne({ slug: req.body.slug }).select('_id slug').lean();
  if (!painting) throw ApiError.notFound('We could not find that painting.');
  const entry = await Favourite.findOneAndUpdate(
    { user: req.user._id, painting: painting._id },
    { $setOnInsert: { user: req.user._id, painting: painting._id } },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  ).lean();
  const count = await Favourite.countDocuments({ user: req.user._id });
  res.status(201).json({ slug: painting.slug, savedAt: entry.createdAt, count });
}

export async function remove(req, res) {
  const painting = await Painting.findOne({ slug: req.params.slug }).select('_id').lean();
  if (painting) await Favourite.deleteOne({ user: req.user._id, painting: painting._id });
  const count = await Favourite.countDocuments({ user: req.user._id });
  res.json({ slug: req.params.slug, count });
}

export async function exportPdf(req, res) {
  const rows = await myFavourites(req.user);
  const buffer = await favouritesPdf(req.user, rows.map((r) => r.painting));
  sendFile(res, buffer, 'artmind_favourites.pdf', TYPES.pdf);
}
