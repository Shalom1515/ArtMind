import { Painting, ViewEvent } from '../../models/index.js';
import { ARTIST_FIELDS } from '../catalogue/index.js';

const WEEK = 7 * 24 * 60 * 60 * 1000;

// Most viewed in the last 7 days, topped up with featured paintings when there are not enough views.
export async function trendingPaintings(limit = 6) {
  const rows = await ViewEvent.aggregate([
    { $match: { createdAt: { $gte: new Date(Date.now() - WEEK) } } },
    { $group: { _id: '$painting', n: { $sum: 1 } } },
    { $sort: { n: -1, _id: 1 } },
    { $limit: limit },
  ]);
  const ids = rows.map((r) => String(r._id));
  const docs = await Painting.find({ _id: { $in: ids } }).populate('artist', ARTIST_FIELDS).lean();
  const byId = new Map(docs.map((d) => [String(d._id), d]));
  const result = ids.map((id) => byId.get(id)).filter(Boolean);
  if (result.length < limit) {
    const featured = await Painting.find({ featured: true, _id: { $nin: result.map((p) => p._id) } })
      .sort({ viewCount: -1, title: 1 })
      .limit(limit - result.length)
      .populate('artist', ARTIST_FIELDS)
      .lean();
    result.push(...featured);
  }
  return result;
}
