import { Painting, SearchLog } from '../../models/index.js';
import { ARTIST_FIELDS, toCard } from '../catalogue/index.js';
import { chatJson, isAvailable, TIMEOUTS } from '../assistant/modelClient.js';
import { colourLabel, coloursOf, GROUPS, LABELS, STOP_WORDS, TYPE_ORDER, vocabulary } from './vocabulary.js';

export { forgetVocabulary } from './vocabulary.js';

function makeChip(type, value) {
  const shown = type === 'colour' ? colourLabel(value) : value;
  return { key: `${type}:${value}`, type, value: String(value), label: `${LABELS[type]}: ${shown}` };
}

function sortChips(chips) {
  return chips.sort((a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type));
}

function yearChips(text) {
  const chips = [];
  let rest = text;
  const take = (pattern, make) => {
    rest = rest.replace(pattern, (...m) => {
      const chip = make(...m);
      if (chip) chips.push(chip);
      return ' ';
    });
  };
  take(/\b(before|after|since)\s+(1[0-9]{3}|20[0-9]{2})\b/g, (_, word, year) => makeChip('year', `${word === 'before' ? 'before' : 'after'} ${year}`));
  take(/\b(1[0-9]{2}0|20[0-9]0)s\b/g, (_, decade) => makeChip('year', `${decade}s`));
  take(/\b(1[0-9]{3}|20[0-9]{2})\b/g, (_, year) => makeChip('year', year));
  return { chips, rest };
}

export function yearRange(value) {
  let m = /^(\d{4})s$/.exec(value);
  if (m) return { from: Number(m[1]), to: Number(m[1]) + 9 };
  m = /^before (\d{4})$/.exec(value);
  if (m) return { from: 0, to: Number(m[1]) - 1 };
  m = /^after (\d{4})$/.exec(value);
  if (m) return { from: Number(m[1]), to: 9999 };
  m = /^(\d{4})$/.exec(value);
  if (m) return { from: Number(m[1]), to: Number(m[1]) };
  return null;
}

// Rule based reading of a sentence, using words built from our own data.
export async function understandWithRules(sentence) {
  const vocab = await vocabulary();
  const years = yearChips(` ${String(sentence).toLowerCase()} `);
  let text = ` ${years.rest.replace(/[^a-z0-9\s']/g, ' ').replace(/'/g, '').replace(/\s+/g, ' ')} `;
  const chips = [...years.chips];
  const add = (type, value) => {
    if (!chips.some((c) => c.key === `${type}:${value}`)) chips.push(makeChip(type, value));
  };

  for (const artist of vocab.artists) {
    for (const part of artist.parts) {
      if (text.includes(` ${part} `)) {
        add('artist', artist.name);
        text = text.split(` ${part} `).join(' ');
      }
    }
  }

  const phrases = [];
  for (const [type, groups] of Object.entries(vocab.words)) {
    for (const [value, words] of Object.entries(groups)) for (const word of words) phrases.push({ type, value, word });
  }
  phrases.sort((a, b) => b.word.length - a.word.length);
  for (const { type, value, word } of phrases) {
    if (text.includes(` ${word} `)) {
      add(type, value);
      text = text.split(` ${word} `).join(' ');
    }
  }

  for (const word of text.trim().split(' ')) {
    if (word.length > 2 && !STOP_WORDS.has(word) && [...vocab.tagWords].some((t) => t.startsWith(word) || word.startsWith(t) && t.length > 3)) add('keyword', word);
  }
  return sortChips(chips);
}

const MODEL_PROMPT = `You turn a gallery search sentence into filters. Answer with JSON only, no other text, in this shape:
{"category":[],"style":[],"medium":[],"surface":[],"mood":[],"colour":[],"artist":[],"keywords":[]}
Use only values from these lists. Leave a list empty when the sentence does not ask for it.`;

async function understandWithModel(sentence, vocab) {
  const lists = Object.fromEntries(Object.entries(vocab.allowed).map(([type, set]) => [type, [...set]]));
  const reply = await chatJson([
    { role: 'system', content: `${MODEL_PROMPT}\n${JSON.stringify(lists)}` },
    { role: 'user', content: sentence },
  ], { timeoutMs: TIMEOUTS.search });
  if (!reply) return [];
  const chips = [];
  for (const type of ['category', 'style', 'medium', 'surface', 'mood', 'colour', 'artist']) {
    const values = Array.isArray(reply[type]) ? reply[type] : [];
    for (const value of values) {
      const match = [...vocab.allowed[type]].find((v) => v.toLowerCase() === String(value).toLowerCase());
      if (match) chips.push(makeChip(type, match));
    }
  }
  for (const word of Array.isArray(reply.keywords) ? reply.keywords : []) {
    const clean = String(word).toLowerCase().trim();
    if (clean.length > 2 && !STOP_WORDS.has(clean) && vocab.tagWords.has(clean)) chips.push(makeChip('keyword', clean));
  }
  return chips;
}

// Reads the sentence with our rules and, when the model is set, merges in what it understood.
export async function understand(sentence, { useModel = true } = {}) {
  const [rules, model] = await Promise.all([
    understandWithRules(sentence),
    useModel && isAvailable() ? vocabulary().then((vocab) => understandWithModel(sentence, vocab)) : [],
  ]);
  const chips = [...rules];
  for (const chip of model) {
    const covered = chips.some((c) => c.key === chip.key || (chip.type === 'keyword' && c.type !== 'keyword' && c.value.toLowerCase() === chip.value));
    if (!covered) chips.push(chip);
  }
  return sortChips(chips);
}

function chipMatches(p, chip) {
  if (GROUPS[chip.key]) return GROUPS[chip.key](p);
  switch (chip.type) {
    case 'colour': return coloursOf(p).includes(chip.value);
    case 'artist': return p.artist?.name === chip.value;
    case 'year': {
      const range = yearRange(chip.value);
      return Boolean(range) && p.year >= range.from && p.year <= range.to;
    }
    default: return p[chip.type] === chip.value;
  }
}

async function textScores(words) {
  if (!words.length) return new Map();
  try {
    const rows = await Painting.find({ $text: { $search: words.join(' ') } }, { score: { $meta: 'textScore' } }).select('_id').lean();
    const max = Math.max(1, ...rows.map((r) => r.score));
    return new Map(rows.map((r) => [String(r._id), r.score / max]));
  } catch {
    return new Map();
  }
}

// Paintings must match every chip type (any value inside a type). Ranking: filter matches, then tags, then the text index.
export async function runSearch(chips, { all } = {}) {
  const paintings = all || (await Painting.find({}).populate('artist', ARTIST_FIELDS).lean());
  const filters = chips.filter((c) => c.type !== 'keyword');
  const keywords = chips.filter((c) => c.type === 'keyword').map((c) => c.value.toLowerCase());
  const types = [...new Set(filters.map((c) => c.type))];
  if (!filters.length && !keywords.length) return [];
  const text = await textScores(keywords);
  const maxViews = Math.max(1, ...paintings.map((p) => p.viewCount || 0));

  const scored = paintings.map((p) => {
    const matchedTypes = types.filter((type) => filters.some((c) => c.type === type && chipMatches(p, c))).length;
    const matchedChips = filters.filter((c) => chipMatches(p, c)).length;
    const tags = (p.tags || []).join(' ').toLowerCase();
    const titleText = `${p.title} ${p.description || ''}`.toLowerCase();
    const tagHits = keywords.filter((k) => tags.includes(k)).length;
    const titleHits = keywords.filter((k) => titleText.includes(k)).length;
    const score = matchedTypes * 10 + matchedChips + tagHits * 3 + titleHits + (text.get(String(p._id)) || 0) * 2 + ((p.viewCount || 0) / maxViews) * 0.3;
    return { p, matchedTypes, keywordHit: tagHits + titleHits > 0 || text.has(String(p._id)), score };
  });

  let results;
  if (types.length) {
    results = scored.filter((x) => x.matchedTypes === types.length);
    if (!results.length) results = scored.filter((x) => x.matchedTypes > 0 && x.matchedTypes >= Math.ceil(types.length / 2));
  } else {
    results = scored.filter((x) => x.keywordHit);
  }
  return results.sort((a, b) => b.score - a.score || a.p.title.localeCompare(b.p.title)).map((x) => x.p);
}

export async function logSearch({ query, user, visitorId, chips, resultCount }) {
  try {
    await SearchLog.create({
      query,
      normalised: query.toLowerCase().replace(/\s+/g, ' ').trim(),
      user: user?._id || null,
      visitorId: user ? '' : visitorId || '',
      understood: chips.map((c) => ({ type: c.type, value: c.value })),
      resultCount,
    });
  } catch (err) {
    console.warn(`[search] Could not log the search: ${err.message}`);
  }
}

export async function search({ q, exclude = [], sort = 'best', page, limit }, { user, visitorId } = {}) {
  const understood = (await understand(q)).filter((chip) => !exclude.includes(chip.key));
  let items = await runSearch(understood);
  if (sort === 'newest') items = [...items].sort((a, b) => b.year - a.year || a.title.localeCompare(b.title));
  if (sort === 'oldest') items = [...items].sort((a, b) => a.year - b.year || a.title.localeCompare(b.title));
  if (!exclude.length) await logSearch({ query: q, user, visitorId, chips: understood, resultCount: items.length });
  const size = Math.min(Math.max(Number(limit) || 12, 1), 60);
  const pages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(Math.max(Number(page) || 1, 1), pages);
  return {
    query: q,
    understood,
    items: items.slice((current - 1) * size, current * size).map(toCard),
    page: current,
    limit: size,
    total: items.length,
    pages,
  };
}
