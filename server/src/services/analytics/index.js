import { CATEGORIES } from '../../config/constants.js';
import { Artist, Conversation, Favourite, Painting, SearchLog, User, ViewEvent } from '../../models/index.js';
import { chat, isAvailable, TIMEOUTS } from '../assistant/modelClient.js';
import { cardsInOrder } from '../catalogue/index.js';
import { collectionsFor, recommendFor } from '../recommendations/index.js';

export { trendingPaintings } from './trending.js';

const DAY = 24 * 60 * 60 * 1000;
const LAGOS = 'Africa/Lagos';
const LAGOS_OFFSET = 60 * 60 * 1000;

const firstName = (name) => String(name || '').split(' ')[0] || 'Someone';

async function viewedAndSaved(user) {
  const [views, favourites] = await Promise.all([
    ViewEvent.find({ user: user._id }).sort({ createdAt: -1 }).populate('painting', 'slug category mood medium tags').lean(),
    Favourite.find({ user: user._id }).sort({ createdAt: -1 }).populate('painting', 'slug title category mood medium tags').lean(),
  ]);
  return { views: views.filter((v) => v.painting), favourites: favourites.filter((f) => f.painting) };
}

function topValues(rows, read, n) {
  const counts = new Map();
  for (const row of rows) for (const value of [].concat(read(row) || [])) counts.set(value, (counts.get(value) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([v]) => v);
}

const joinWords = (list) => (list.length > 1 ? `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}` : list[0] || '');

export function tasteTemplate(paintings, interests = [], variant = 0) {
  if (!paintings.length) {
    if (interests.length) return `You told us you like ${joinWords(interests.map((c) => c.toLowerCase()))} paintings. Look around the gallery and save a few, and we will describe your taste here.`;
    return 'Look around the gallery and save a few paintings. We will describe your taste here.';
  }
  const [mood] = topValues(paintings, (p) => p.mood, 1);
  const mediums = topValues(paintings, (p) => p.medium, 2).map((m) => m.toLowerCase());
  const [first, second] = topValues(paintings, (p) => p.category, 2);
  const subjects = topValues(paintings, (p) => (p.tags || []).filter((t) => t.split(' ').length <= 2), 2);
  const lines = [
    `You keep coming back to ${mood.toLowerCase()} paintings, mostly in ${joinWords(mediums)}. ${first} paintings are your favourites${second ? `, with ${second.toLowerCase()} close behind` : ''}${subjects.length ? `, and you are drawn to ${joinWords(subjects)}` : ''}.`,
    `${first} is where you spend most of your time, and you lean towards ${mood.toLowerCase()} work. You seem to like the look of ${joinWords(mediums)}${subjects.length ? `, especially ${joinWords(subjects)}` : ''}.`,
    `Your eye goes to ${mood.toLowerCase()} ${first.toLowerCase()} paintings${second ? ` and ${second.toLowerCase()} scenes` : ''}. ${mediums[0] ? `${mediums[0].charAt(0).toUpperCase()}${mediums[0].slice(1)} is the medium you look at most.` : ''}`.trim(),
  ];
  return lines[variant % lines.length];
}

export async function writeTaste(user, variant = 0) {
  const { views, favourites } = await viewedAndSaved(user);
  const paintings = [...views.slice(0, 60).map((v) => v.painting), ...favourites.flatMap((f) => [f.painting, f.painting, f.painting])];
  const template = tasteTemplate(paintings, user.interests, variant);
  if (!paintings.length || !isAvailable()) return template;
  const rewritten = await chat([
    { role: 'system', content: 'Rewrite the sentence about a gallery visitor\'s taste so it sounds natural and warm. Keep every fact, add nothing new, use British spelling, speak to the visitor as "you", at most two sentences. Answer with the sentence only.' },
    { role: 'user', content: template },
  ], { timeoutMs: TIMEOUTS.writing });
  return rewritten && rewritten.length < 400 ? rewritten.replace(/^["']|["']$/g, '') : template;
}

export async function refreshTaste(user) {
  user.tasteVariant = ((user.tasteVariant || 0) + 1) % 3;
  user.tasteSummary = await writeTaste(user, user.tasteVariant);
  await user.save();
  return user.tasteSummary;
}

export async function insights(user) {
  const { views, favourites } = await viewedAndSaved(user);
  if (!user.tasteSummary) {
    user.tasteSummary = await writeTaste(user, user.tasteVariant || 0);
    await user.save();
  }
  const recentSlugs = [...new Set(views.map((v) => v.painting.slug))].slice(0, 6);
  const categoryCounts = new Map();
  for (const row of [...views, ...favourites]) categoryCounts.set(row.painting.category, (categoryCounts.get(row.painting.category) || 0) + 1);
  const [recommended, recentlyViewed, conversations, collectionsForYou] = await Promise.all([
    recommendFor(user, 8),
    cardsInOrder(recentSlugs),
    Conversation.countDocuments({ user: user._id }),
    collectionsFor(user),
  ]);
  return {
    stats: {
      viewed: views.length,
      favourites: favourites.length,
      categoriesExplored: new Set(views.map((v) => v.painting.category)).size,
      conversations,
    },
    recommended,
    recentlyViewed,
    favouriteCategories: [...categoryCounts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5),
    taste: user.tasteSummary,
    collectionsForYou,
  };
}

function lagosDayKey(time) {
  return new Date(time + LAGOS_OFFSET).toISOString().slice(0, 10);
}

export function lagosRange(days, now = Date.now()) {
  const startOfToday = Math.floor((now + LAGOS_OFFSET) / DAY) * DAY - LAGOS_OFFSET;
  const since = startOfToday - (days - 1) * DAY;
  const keys = Array.from({ length: days }, (_, i) => lagosDayKey(since + i * DAY));
  return { since: new Date(since), keys };
}

async function perDay(Model, since, keys) {
  const rows = await Model.aggregate([
    { $match: { createdAt: { $gte: since } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: LAGOS } }, n: { $sum: 1 } } },
  ]);
  const counts = new Map(rows.map((r) => [r._id, r.n]));
  return keys.map((date) => ({ date, count: counts.get(date) || 0 }));
}

const paintingRef = (p) => (p ? { slug: p.slug, title: p.title, image: p.image, tones: p.tones?.length ? p.tones : (p.palette || []).slice(0, 3) } : null);

async function recentActivity() {
  const fields = 'slug title image tones palette';
  const [views, favourites, searches, users] = await Promise.all([
    ViewEvent.find({ user: { $ne: null } }).sort({ createdAt: -1 }).limit(10).populate('user', 'name').populate('painting', fields).lean(),
    Favourite.find({}).sort({ createdAt: -1 }).limit(10).populate('user', 'name').populate('painting', fields).lean(),
    SearchLog.find({}).sort({ createdAt: -1 }).limit(10).populate('user', 'name').lean(),
    User.find({}).sort({ joinedAt: -1 }).limit(10).select('name joinedAt').lean(),
  ]);
  return [
    ...views.filter((v) => v.user && v.painting).map((v) => ({ type: 'view', text: `${firstName(v.user.name)} viewed ${v.painting.title}`, painting: paintingRef(v.painting), at: v.createdAt })),
    ...favourites.filter((f) => f.user && f.painting).map((f) => ({ type: 'favourite', text: `${firstName(f.user.name)} saved ${f.painting.title}`, painting: paintingRef(f.painting), at: f.createdAt })),
    ...searches.map((s) => ({ type: 'search', text: `${s.user ? firstName(s.user.name) : 'A visitor'} searched for ${s.query}`, painting: null, at: s.createdAt })),
    ...users.map((u) => ({ type: 'register', text: `${u.name} created an account`, painting: null, at: u.joinedAt })),
  ].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 10);
}

export async function overview(days = 30) {
  const { since, keys } = lagosRange(days);
  const [paintings, artists, users, views, searches, viewsPerDay, searchesPerDay, top, byCategory, queries, activity] = await Promise.all([
    Painting.countDocuments(),
    Artist.countDocuments(),
    User.countDocuments(),
    ViewEvent.countDocuments({ createdAt: { $gte: since } }),
    SearchLog.countDocuments({ createdAt: { $gte: since } }),
    perDay(ViewEvent, since, keys),
    perDay(SearchLog, since, keys),
    ViewEvent.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$painting', n: { $sum: 1 } } },
      { $sort: { n: -1, _id: 1 } },
      { $limit: 10 },
      { $lookup: { from: 'paintings', localField: '_id', foreignField: '_id', as: 'p' } },
      { $unwind: '$p' },
    ]),
    ViewEvent.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $lookup: { from: 'paintings', localField: 'painting', foreignField: '_id', as: 'p' } },
      { $project: { category: { $ifNull: [{ $first: '$p.category' }, '$category'] } } },
      { $group: { _id: '$category', n: { $sum: 1 } } },
    ]),
    SearchLog.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$normalised', n: { $sum: 1 } } },
      { $sort: { n: -1, _id: 1 } },
      { $limit: 8 },
    ]),
    recentActivity(),
  ]);
  const categoryCounts = new Map(byCategory.map((r) => [r._id, r.n]));
  const categoryTotal = CATEGORIES.reduce((sum, c) => sum + (categoryCounts.get(c) || 0), 0) || 1;
  return {
    totals: { paintings, artists, users, views, searches },
    viewsPerDay,
    searchesPerDay,
    topPaintings: top.map((r) => ({ slug: r.p.slug, title: r.p.title, views: r.n })),
    viewsByCategory: CATEGORIES
      .map((category) => ({ category, count: categoryCounts.get(category) || 0 }))
      .map((row) => ({ ...row, percent: Math.round((row.count / categoryTotal) * 100) }))
      .sort((a, b) => b.count - a.count),
    topQueries: queries.map((q) => ({ query: q._id, count: q.n })),
    recentActivity: activity,
  };
}
