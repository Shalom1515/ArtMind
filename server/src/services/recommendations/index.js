import { Favourite, Painting, ViewEvent } from '../../models/index.js';
import { ARTIST_FIELDS, toCard } from '../catalogue/index.js';
import { paletteDistance } from '../palette/index.js';
import { cosine } from '../recognition/model.js';
import { trendingPaintings } from '../analytics/trending.js';

const WEIGHTS = { view: 1, favourite: 3, interest: 2 };

export const COLLECTION_TITLES = {
  Landscape: 'Still water and soft light',
  Flower: 'Gardens in bloom',
  Nature: 'Birds and quiet places',
  Abstract: 'Shape and colour',
  Figurative: 'People and their stories',
  Religious: 'Light and faith',
};

export function loadPaintings() {
  return Painting.find({}).select('+embedding').populate('artist', ARTIST_FIELDS).lean();
}

const paletteOf = (p) => (p.palette?.length ? p.palette : p.tones || []);

export function attributeScore(a, b) {
  let score = 0;
  if (a.category === b.category) score += 3;
  if (a.style === b.style) score += 3;
  if (a.mood === b.mood) score += 2;
  if (a.medium === b.medium) score += 1;
  if (String(a.artist?._id || a.artist) === String(b.artist?._id || b.artist)) score += 1;
  score += Math.min(3, (a.tags || []).filter((t) => (b.tags || []).includes(t)).length);
  score += (a.colourGroups || []).filter((c) => (b.colourGroups || []).includes(c)).length * 0.5;
  score += (1 - paletteDistance(paletteOf(a), paletteOf(b))) * 1.5;
  return score / 15;
}

// Blends MobileNet similarity with the shared attributes. Without embeddings only the attributes count.
export function similarity(a, b) {
  const attributes = attributeScore(a, b);
  if (!a.embedding?.length || !b.embedding?.length) return attributes;
  const deep = Math.max(0, (cosine(a.embedding, b.embedding) - 0.2) / 0.8);
  return attributes * 0.55 + deep * 0.45;
}

export async function similarTo(painting, limit = 4, { exclude = [], all } = {}) {
  const paintings = all || (await loadPaintings());
  const source = paintings.find((p) => p.slug === painting.slug) || painting;
  return paintings
    .filter((p) => p.slug !== source.slug && !exclude.includes(p.slug))
    .map((p) => ({ p, score: similarity(source, p) }))
    .sort((x, y) => y.score - x.score || y.p.year - x.p.year)
    .slice(0, limit)
    .map((x) => x.p);
}

async function userSignals(user) {
  const [views, favourites] = await Promise.all([
    ViewEvent.find({ user: user._id }).sort({ createdAt: -1 }).limit(200).select('painting createdAt').lean(),
    Favourite.find({ user: user._id }).sort({ createdAt: -1 }).select('painting createdAt').lean(),
  ]);
  return { views, favourites };
}

function addTo(map, key, amount) {
  if (key) map.set(key, (map.get(key) || 0) + amount);
}

function buildProfile(user, signals, byId) {
  const profile = { category: new Map(), style: new Map(), medium: new Map(), mood: new Map(), artist: new Map(), palettes: [], centre: null, total: 0 };
  const centre = [];
  const learn = (p, weight) => {
    addTo(profile.category, p.category, weight);
    addTo(profile.style, p.style, weight);
    addTo(profile.medium, p.medium, weight);
    addTo(profile.mood, p.mood, weight);
    addTo(profile.artist, String(p.artist?._id || p.artist), weight);
    profile.palettes.push({ palette: paletteOf(p), weight });
    if (p.embedding?.length) {
      p.embedding.forEach((v, i) => { centre[i] = (centre[i] || 0) + v * weight; });
    }
    profile.total += weight;
  };
  signals.views.slice(0, 60).forEach((v) => byId.get(String(v.painting)) && learn(byId.get(String(v.painting)), WEIGHTS.view));
  signals.favourites.forEach((f) => byId.get(String(f.painting)) && learn(byId.get(String(f.painting)), WEIGHTS.favourite));
  for (const interest of user.interests || []) {
    addTo(profile.category, interest, WEIGHTS.interest * 3);
    profile.total += WEIGHTS.interest;
  }
  if (centre.length) {
    const length = Math.hypot(...centre) || 1;
    profile.centre = centre.map((v) => v / length);
  }
  return profile;
}

function share(map, key) {
  const max = Math.max(0, ...map.values());
  return max ? (map.get(key) || 0) / max : 0;
}

function scoreFor(p, profile, maxViews) {
  let score = share(profile.category, p.category) * 3
    + share(profile.style, p.style) * 2
    + share(profile.medium, p.medium)
    + share(profile.mood, p.mood) * 1.5
    + share(profile.artist, String(p.artist?._id || p.artist));
  if (profile.palettes.length) {
    const closeness = profile.palettes.reduce((sum, x) => sum + (1 - paletteDistance(x.palette, paletteOf(p))) * x.weight, 0)
      / profile.palettes.reduce((sum, x) => sum + x.weight, 0);
    score += closeness * 1.5;
  }
  if (profile.centre && p.embedding?.length) score += Math.max(0, cosine(profile.centre, p.embedding)) * 3;
  score += ((p.viewCount || 0) / (maxViews || 1)) * 0.5;
  return score;
}

function reasonFor(p, { saved, viewed, interests }) {
  let bestSaved = null;
  for (const s of saved) {
    const value = similarity(s, p);
    if (value > 0.45 && (!bestSaved || value > bestSaved.value)) bestSaved = { painting: s, value };
  }
  if (bestSaved) return { kind: 'saved', text: `Because you saved ${bestSaved.painting.title}` };
  if (interests.includes(p.category)) return { kind: 'interest', text: `Matches your interest in ${p.category}` };
  if (viewed.some((v) => v.category === p.category)) return { kind: 'viewed', text: `Because you viewed ${p.category} recently` };
  return { kind: 'popular', text: 'Popular with visitors this week' };
}

export async function scoredFor(user, { all } = {}) {
  const paintings = all || (await loadPaintings());
  const byId = new Map(paintings.map((p) => [String(p._id), p]));
  const signals = await userSignals(user);
  const profile = buildProfile(user, signals, byId);
  const seen = new Set([...signals.views, ...signals.favourites].map((x) => String(x.painting)));
  const saved = signals.favourites.map((f) => byId.get(String(f.painting))).filter(Boolean);
  const viewed = signals.views.slice(0, 15).map((v) => byId.get(String(v.painting))).filter(Boolean);
  const maxViews = Math.max(1, ...paintings.map((p) => p.viewCount || 0));
  const context = { saved: saved.slice(0, 6), viewed, interests: user.interests || [] };
  const ranked = paintings
    .filter((p) => !seen.has(String(p._id)))
    .map((p) => ({ painting: p, score: scoreFor(p, profile, maxViews) }))
    .sort((a, b) => b.score - a.score);
  return { ranked, context, profile, signals, byId };
}

export async function recommendFor(user, limit = 8) {
  if (!user) {
    const trending = await trendingPaintings(limit);
    return trending.map((p) => ({ painting: toCard(p), reason: p.featured ? 'Featured this week' : 'Popular with visitors this week' }));
  }
  const { ranked, context, profile } = await scoredFor(user);
  if (!profile.total) return recommendFor(null, limit);

  // Picks the best scores but lets a reason repeat less often, so the row shows a mix.
  const pool = ranked.slice(0, limit * 4).map((r) => ({ ...r, reason: reasonFor(r.painting, context) }));
  const picked = [];
  const used = new Map();
  while (picked.length < limit && pool.length) {
    let bestIndex = 0;
    let bestValue = -Infinity;
    pool.forEach((r, i) => {
      const value = r.score * 0.85 ** (used.get(r.reason.text) || 0);
      if (value > bestValue) {
        bestValue = value;
        bestIndex = i;
      }
    });
    const [choice] = pool.splice(bestIndex, 1);
    used.set(choice.reason.text, (used.get(choice.reason.text) || 0) + 1);
    picked.push({ painting: toCard(choice.painting), reason: choice.reason.text });
  }
  if (picked.length < limit) {
    const taken = new Set(picked.map((x) => x.painting.slug));
    for (const p of await trendingPaintings(limit * 2)) {
      if (picked.length >= limit) break;
      if (!taken.has(p.slug)) picked.push({ painting: toCard(p), reason: 'Popular with visitors this week' });
    }
  }
  return picked;
}

export async function collectionsFor(user) {
  const { ranked, context, signals, byId } = await scoredFor(user);
  const viewCounts = new Map();
  for (const v of signals.views) {
    const p = byId.get(String(v.painting));
    if (p) viewCounts.set(p.category, (viewCounts.get(p.category) || 0) + 1);
  }
  const groups = new Map();
  for (const r of ranked.slice(0, 30)) {
    const g = groups.get(r.painting.category) || { score: 0, items: [] };
    g.score += r.score;
    g.items.push(r.painting);
    groups.set(r.painting.category, g);
  }
  const lastSaved = context.saved[0];
  return [...groups.entries()]
    .filter(([, g]) => g.items.length >= 2)
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, 3)
    .map(([category, g]) => {
      let reason = `Because you looked at ${category.toLowerCase()} paintings`;
      if ((viewCounts.get(category) || 0) >= 5) reason = `Because you viewed many ${category.toLowerCase()} paintings`;
      else if (context.interests.includes(category)) reason = `Matches your interest in ${category}`;
      else if (lastSaved && lastSaved.category === category) reason = `Because you saved ${lastSaved.title}`;
      return { title: COLLECTION_TITLES[category] || `${category} for you`, reason, paintings: g.items.slice(0, 4).map(toCard) };
    });
}
