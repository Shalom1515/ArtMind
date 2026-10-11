import { COLOUR_GROUPS } from '../../utils/constants.js';
import { artistBySlug, db, paintingBySlug, toCard, userById, viewCount } from './db.js';

const DAY = 24 * 60 * 60 * 1000;
const list = (value) => (value ? String(value).split(',').map((v) => v.trim()).filter(Boolean) : []);

const FACETS = {
  category: (p) => [p.category],
  style: (p) => [p.style],
  medium: (p) => [p.medium],
  surface: (p) => [p.surface],
  colour: (p) => p.colourGroups,
  mood: (p) => [p.mood],
};

function matches(p, query, skip) {
  for (const [facet, read] of Object.entries(FACETS)) {
    if (facet === skip) continue;
    const wanted = list(query[facet]);
    if (wanted.length && !read(p).some((v) => wanted.includes(v))) return false;
  }
  if (query.artist && p.artistSlug !== query.artist) return false;
  if (query.yearFrom && p.year < Number(query.yearFrom)) return false;
  if (query.yearTo && p.year > Number(query.yearTo)) return false;
  if (String(query.featured) === 'true' && !p.featured) return false;
  if (query.q) {
    const q = String(query.q).toLowerCase();
    const artist = artistBySlug(p.artistSlug)?.name || '';
    const text = [p.title, artist, ...p.tags].join(' ').toLowerCase();
    if (!text.includes(q)) return false;
  }
  return true;
}

export function sortPaintings(items, sort) {
  const sorted = [...items];
  if (sort === 'oldest') sorted.sort((a, b) => a.year - b.year || a.title.localeCompare(b.title));
  else if (sort === 'title') sorted.sort((a, b) => a.title.localeCompare(b.title));
  else if (sort === 'popular') sorted.sort((a, b) => viewCount(b.slug) - viewCount(a.slug));
  else sorted.sort((a, b) => b.year - a.year || a.title.localeCompare(b.title));
  return sorted;
}

export function filterPaintings(query) {
  const all = db().paintings;
  const items = sortPaintings(all.filter((p) => matches(p, query)), query.sort);
  const counts = {};
  for (const [facet, read] of Object.entries(FACETS)) {
    counts[facet] = {};
    for (const p of all.filter((x) => matches(x, query, facet))) {
      for (const value of read(p)) counts[facet][value] = (counts[facet][value] || 0) + 1;
    }
  }
  return { items, counts };
}

export function similarity(a, b) {
  let score = 0;
  if (a.category === b.category) score += 3;
  if (a.style === b.style) score += 3;
  if (a.mood === b.mood) score += 2;
  if (a.medium === b.medium) score += 1;
  if (a.artistSlug === b.artistSlug) score += 1;
  score += a.tags.filter((t) => b.tags.includes(t)).length;
  score += a.colourGroups.filter((c) => b.colourGroups.includes(c)).length * 0.5;
  return score;
}

export function similarTo(painting, limit = 4, exclude = []) {
  return db().paintings
    .filter((p) => p.slug !== painting.slug && !exclude.includes(p.slug))
    .map((p) => ({ p, score: similarity(painting, p) }))
    .sort((x, y) => y.score - x.score || y.p.year - x.p.year)
    .slice(0, limit)
    .map((x) => x.p);
}

export function trending(limit = 6) {
  const since = Date.now() - 7 * DAY;
  const counts = {};
  for (const v of db().views) if (new Date(v.at).getTime() >= since) counts[v.slug] = (counts[v.slug] || 0) + 1;
  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([slug]) => paintingBySlug(slug)).filter(Boolean);
  const fallback = db().paintings.filter((p) => p.featured);
  return [...ranked, ...fallback.filter((p) => !ranked.includes(p))].slice(0, limit);
}

const WORDS = {
  category: {
    Abstract: ['abstract', 'abstraction', 'abstracts'],
    Landscape: ['landscape', 'landscapes', 'scenery', 'countryside', 'hills', 'valley', 'river', 'lake', 'harbour', 'village'],
    Flower: ['flower', 'flowers', 'floral', 'blossom', 'blossoms', 'bouquet', 'roses', 'lilies'],
    Nature: ['nature', 'bird', 'birds', 'animal', 'animals', 'wildlife', 'forest', 'trees', 'leaves'],
    Figurative: ['figurative', 'people', 'person', 'portrait', 'portraits', 'figure', 'figures', 'woman', 'women', 'man', 'men'],
    Religious: ['religious', 'sacred', 'faith', 'bible', 'biblical', 'saint', 'saints', 'angel', 'angels', 'devotion', 'christian'],
  },
  style: {
    Impressionism: ['impressionism', 'impressionist', 'impressionistic'],
    Realism: ['realism', 'realist', 'realistic'],
    Expressionism: ['expressionism', 'expressionist'],
    'Abstract expressionism': ['abstract expressionism', 'abstract expressionist'],
    'Colour field': ['colour field', 'color field'],
    'Geometric abstraction': ['geometric'],
    'Ink wash': ['ink wash', 'sumi'],
    'Still life': ['still life', 'still lifes'],
    Contemporary: ['contemporary', 'modern'],
    Folk: ['folk'],
    'Renaissance revival': ['renaissance'],
    'Baroque revival': ['baroque'],
  },
  medium: {
    Oil: ['oil', 'oils'],
    Acrylic: ['acrylic', 'acrylics'],
    Watercolour: ['watercolour', 'watercolours', 'watercolor', 'watercolors'],
    Gouache: ['gouache'],
    Ink: ['ink'],
    Pastel: ['pastel', 'pastels'],
    Charcoal: ['charcoal'],
    Tempera: ['tempera'],
    'Mixed media': ['mixed media'],
  },
  surface: {
    Canvas: ['canvas'],
    Linen: ['linen'],
    Paper: ['paper'],
    'Wood panel': ['wood panel', 'wooden panel', 'panel', 'wood'],
    Board: ['board'],
  },
  mood: {
    Calm: ['calm', 'peaceful', 'quiet', 'serene', 'still', 'relaxing', 'soft light', 'soft'],
    Dramatic: ['dramatic', 'stormy', 'intense'],
    Energetic: ['energetic', 'lively', 'dynamic', 'movement'],
    Joyful: ['joyful', 'happy', 'cheerful', 'bright', 'sunny'],
    Melancholic: ['melancholic', 'melancholy', 'sad', 'wistful'],
    Solemn: ['solemn', 'serious', 'grave'],
    Tender: ['tender', 'gentle', 'loving', 'warmhearted'],
  },
  colour: {
    warm: ['warm colours', 'warm colors', 'warm tones', 'warm'],
    cool: ['cool colours', 'cool colors', 'cool tones', 'cool'],
    red: ['red', 'reds', 'crimson', 'scarlet'],
    orange: ['orange', 'oranges'],
    yellow: ['yellow', 'yellows', 'gold', 'golden', 'ochre'],
    green: ['green', 'greens'],
    teal: ['teal', 'turquoise'],
    blue: ['blue', 'blues', 'navy', 'cobalt'],
    violet: ['violet', 'purple', 'lilac'],
    pink: ['pink', 'pinks', 'rose'],
    cream: ['cream', 'white'],
    grey: ['grey', 'gray', 'silver'],
    brown: ['brown', 'browns', 'earthy'],
    black: ['black', 'dark'],
  },
};

const COLOUR_SETS = { warm: ['red', 'orange', 'yellow', 'pink', 'brown'], cool: ['blue', 'teal', 'green', 'violet', 'grey'] };

const STOP = new Set('a an and the of in on with by for to me some show find any paintings painting art works work that is are i want like from at or about please something which who what my'.split(' '));

const LABELS = { category: 'Category', style: 'Style', medium: 'Medium', surface: 'Surface', mood: 'Mood', colour: 'Colour', artist: 'Artist', keyword: 'Keyword' };

function colourLabel(value) {
  if (value === 'warm') return 'Warm';
  if (value === 'cool') return 'Cool';
  return COLOUR_GROUPS.find((c) => c.key === value)?.label || value;
}

export function understand(sentence) {
  let text = ` ${String(sentence).toLowerCase().replace(/[^a-z0-9\s']/g, ' ').replace(/\s+/g, ' ')} `;
  const chips = [];
  const add = (type, value) => {
    const key = `${type}:${value}`;
    if (chips.some((c) => c.key === key)) return;
    const shown = type === 'colour' ? colourLabel(value) : value;
    chips.push({ key, type, value, label: `${LABELS[type]}: ${shown}` });
  };

  for (const artist of db().artists) {
    const parts = artist.name.toLowerCase().split(' ');
    for (const part of [artist.name.toLowerCase(), ...parts]) {
      if (part.length > 2 && text.includes(` ${part} `)) {
        add('artist', artist.name);
        text = text.replace(` ${part} `, ' ');
      }
    }
  }

  const phrases = [];
  for (const [type, groups] of Object.entries(WORDS)) {
    for (const [value, words] of Object.entries(groups)) for (const word of words) phrases.push({ type, value, word });
  }
  phrases.sort((a, b) => b.word.length - a.word.length);
  for (const { type, value, word } of phrases) {
    if (text.includes(` ${word} `)) {
      add(type, value);
      text = text.split(` ${word} `).join(' ');
    }
  }

  const tagWords = new Set(db().paintings.flatMap((p) => [...p.tags, ...p.title.toLowerCase().split(' ')]).map((w) => w.toLowerCase()));
  for (const word of text.trim().split(' ')) {
    if (word.length > 2 && !STOP.has(word) && [...tagWords].some((t) => t.includes(word))) add('keyword', word);
  }
  return chips;
}

export function runSearch(chips) {
  const byType = {};
  for (const chip of chips) (byType[chip.type] ||= []).push(chip.value);
  const filterTypes = Object.keys(byType).filter((t) => t !== 'keyword');
  const keywords = byType.keyword || [];

  const scored = db().paintings.map((p) => {
    const artistName = artistBySlug(p.artistSlug)?.name;
    const values = {
      category: [p.category], style: [p.style], medium: [p.medium], surface: [p.surface], mood: [p.mood],
      colour: p.colourGroups, artist: [artistName],
    };
    const passes = filterTypes.every((type) => byType[type].some((wanted) => {
      if (type === 'colour' && COLOUR_SETS[wanted]) return p.colourGroups.some((c) => COLOUR_SETS[wanted].includes(c));
      return values[type].includes(wanted);
    }));
    const text = [p.title, ...p.tags, p.description].join(' ').toLowerCase();
    const keywordHits = keywords.filter((k) => text.includes(k)).length;
    return { p, passes, score: keywordHits * 2 + (p.featured ? 0.5 : 0) + viewCount(p.slug) / 1000 };
  });

  let results = scored.filter((x) => x.passes && (filterTypes.length || x.score >= 2));
  if (!filterTypes.length && !keywords.length) results = [];
  return results.sort((a, b) => b.score - a.score).map((x) => x.p);
}

const COLLECTION_TITLES = {
  Landscape: 'Still water and soft light',
  Flower: 'Gardens in bloom',
  Nature: 'Birds and quiet places',
  Abstract: 'Shape and colour',
  Figurative: 'People and their stories',
  Religious: 'Light and faith',
};

function userViews(user) {
  return db().views.filter((v) => v.userId === user.id).sort((a, b) => new Date(b.at) - new Date(a.at));
}

function userSaved(user) {
  return db().favourites.filter((f) => f.userId === user.id).sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
}

export function recommend(user, limit = 8) {
  const saved = userSaved(user);
  const savedSlugs = saved.map((f) => f.slug);
  const picked = [];
  const taken = new Set(savedSlugs);
  const push = (p, reason) => {
    if (!p || taken.has(p.slug) || picked.length >= limit) return;
    taken.add(p.slug);
    picked.push({ painting: toCard(p), reason });
  };

  const sources = [];
  for (const f of saved.slice(0, 4)) {
    const source = paintingBySlug(f.slug);
    if (source) sources.push(similarTo(source, 6, savedSlugs).map((p) => [p, `Because you saved ${source.title}`]));
  }
  for (const category of user.interests) {
    sources.push(db().paintings.filter((p) => p.category === category).map((p) => [p, `Matches your interest in ${category}`]));
  }
  const recent = userViews(user).slice(0, 10).map((v) => paintingBySlug(v.slug)).filter(Boolean);
  for (const p of recent.slice(0, 3)) {
    sources.push(similarTo(p, 4).map((x) => [x, `Because you viewed ${p.category} recently`]));
  }

  for (let round = 0; picked.length < limit && round < 12; round += 1) {
    for (const source of sources) {
      const next = source.find(([p]) => !taken.has(p.slug));
      if (next) push(next[0], next[1]);
    }
  }
  for (const p of trending(limit * 2)) push(p, 'Popular with visitors this week');
  return picked;
}

export function categoryCounts(user) {
  const counts = {};
  for (const v of userViews(user)) {
    const p = paintingBySlug(v.slug);
    if (p) counts[p.category] = (counts[p.category] || 0) + 1;
  }
  for (const f of userSaved(user)) {
    const p = paintingBySlug(f.slug);
    if (p) counts[p.category] = (counts[p.category] || 0) + 1;
  }
  return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}

function topValues(paintings, read, n) {
  const counts = {};
  for (const p of paintings) counts[read(p)] = (counts[read(p)] || 0) + 1;
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, n).map(([v]) => v);
}

export function tasteText(user, variant = 0) {
  const seen = [...userViews(user).map((v) => v.slug), ...userSaved(user).map((f) => f.slug)].map(paintingBySlug).filter(Boolean);
  if (!seen.length) return 'Look around the gallery and save a few paintings. We will describe your taste here.';
  const [mood] = topValues(seen, (p) => p.mood, 1);
  const mediums = topValues(seen, (p) => p.medium, 2).map((m) => m.toLowerCase());
  const [first, second] = topValues(seen, (p) => p.category, 2);
  const lines = [
    `You keep coming back to ${mood.toLowerCase()} paintings, mostly in ${mediums.join(' and ')}. ${first} paintings are your favourites${second ? `, with ${second.toLowerCase()} close behind` : ''}.`,
    `${first} is where you spend most of your time, and you lean towards ${mood.toLowerCase()} work. You seem to like the look of ${mediums.join(' and ')}.`,
  ];
  return lines[variant % lines.length];
}

export function collectionsFor(user) {
  const counts = categoryCounts(user);
  const saved = userSaved(user).map((f) => f.slug);
  const picks = [];
  const used = new Set();
  const add = (category, reason) => {
    if (!category || used.has(category) || picks.length >= 3) return;
    used.add(category);
    const paintings = db().paintings.filter((p) => p.category === category)
      .sort((a, b) => Number(saved.includes(a.slug)) - Number(saved.includes(b.slug)) || b.year - a.year)
      .slice(0, 4).map(toCard);
    picks.push({ title: COLLECTION_TITLES[category], reason, paintings });
  };
  if (counts[0]) add(counts[0].name, `Because you viewed many ${counts[0].name.toLowerCase()} paintings`);
  for (const interest of user.interests) add(interest, `Matches your interest in ${interest}`);
  const lastSaved = paintingBySlug(saved[0]);
  if (lastSaved) add(lastSaved.category, `Because you saved ${lastSaved.title}`);
  for (const c of counts) add(c.name, `Because you looked at ${c.name.toLowerCase()} paintings`);
  return picks;
}

export function insights(user) {
  const views = userViews(user);
  const recentSlugs = [...new Set(views.map((v) => v.slug))].slice(0, 6);
  const categories = new Set(views.map((v) => paintingBySlug(v.slug)?.category).filter(Boolean));
  if (!user.tasteSummary) user.tasteSummary = tasteText(user);
  return {
    stats: {
      viewed: views.length,
      favourites: userSaved(user).length,
      categoriesExplored: categories.size,
      conversations: db().conversations.filter((c) => c.userId === user.id).length,
    },
    recommended: recommend(user, 8),
    recentlyViewed: recentSlugs.map(paintingBySlug).filter(Boolean).map(toCard),
    favouriteCategories: categoryCounts(user).slice(0, 5),
    taste: user.tasteSummary,
    collectionsForYou: collectionsFor(user),
  };
}

function dayKey(date) {
  return new Date(date).toISOString().slice(0, 10);
}

export function overview(days = 30) {
  const state = db();
  const since = Date.now() - days * DAY;
  const inRange = (at) => new Date(at).getTime() >= since;
  const views = state.views.filter((v) => inRange(v.at));
  const searches = state.searches.filter((s) => inRange(s.at));

  const perDay = (rows) => {
    const counts = {};
    for (const r of rows) counts[dayKey(r.at)] = (counts[dayKey(r.at)] || 0) + 1;
    return Array.from({ length: days }, (_, i) => {
      const date = dayKey(Date.now() - (days - 1 - i) * DAY);
      return { date, count: counts[date] || 0 };
    });
  };

  const bySlug = {};
  for (const v of views) bySlug[v.slug] = (bySlug[v.slug] || 0) + 1;
  const topPaintings = Object.entries(bySlug).sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([slug, count]) => ({ slug, title: paintingBySlug(slug)?.title || slug, views: count }));

  const byCategory = {};
  for (const v of views) {
    const category = paintingBySlug(v.slug)?.category;
    if (category) byCategory[category] = (byCategory[category] || 0) + 1;
  }
  const viewsByCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])
    .map(([category, count]) => ({ category, count, percent: Math.round((count / (views.length || 1)) * 100) }));

  const byQuery = {};
  for (const s of searches) byQuery[s.query.toLowerCase()] = (byQuery[s.query.toLowerCase()] || 0) + 1;
  const topQueries = Object.entries(byQuery).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([query, count]) => ({ query, count }));

  const nameOf = (userId) => (userId ? userById(userId)?.name.split(' ')[0] || 'A user' : 'A visitor');
  const paintingRef = (slug) => {
    const p = paintingBySlug(slug);
    return p ? { slug: p.slug, title: p.title, image: p.image, tones: p.tones } : null;
  };
  const activity = [
    ...state.views.filter((v) => v.userId).map((v) => ({ type: 'view', text: `${nameOf(v.userId)} viewed ${paintingBySlug(v.slug)?.title}`, painting: paintingRef(v.slug), at: v.at })),
    ...state.favourites.map((f) => ({ type: 'favourite', text: `${nameOf(f.userId)} saved ${paintingBySlug(f.slug)?.title}`, painting: paintingRef(f.slug), at: f.savedAt })),
    ...state.searches.slice(-30).map((s) => ({ type: 'search', text: `${nameOf(s.userId)} searched for ${s.query}`, painting: null, at: s.at })),
    ...state.registrations.map((r) => ({ type: 'register', text: `${userById(r.userId)?.name || 'Someone'} created an account`, painting: null, at: r.at })),
  ].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 10);

  return {
    totals: { paintings: state.paintings.length, artists: state.artists.length, users: state.users.length, views: views.length, searches: searches.length },
    viewsPerDay: perDay(views),
    searchesPerDay: perDay(searches),
    topPaintings,
    viewsByCategory,
    topQueries,
    recentActivity: activity,
  };
}
