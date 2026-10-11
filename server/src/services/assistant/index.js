import { ASSISTANT_SUGGESTIONS } from '../../config/constants.js';
import { Artist } from '../../models/index.js';
import { toCard } from '../catalogue/index.js';
import { loadPaintings, similarTo } from '../recommendations/index.js';
import { runSearch, understandWithRules } from '../search/index.js';
import { COMPARE, findGlossary, GLOSSARY, PAGE_HELP } from './glossary.js';
import { chatJson, isAvailable, TIMEOUTS } from './modelClient.js';

export const SUGGESTIONS = ASSISTANT_SUGGESTIONS;

export function titleFor(message) {
  const clean = String(message).replace(/[?.!]+$/, '').replace(/\s+/g, ' ').trim();
  if (clean.length > 48) return `${clean.slice(0, 45)}...`;
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

const uniqueFollowUps = (list) => [...new Set(list.filter(Boolean))].slice(0, 3);

function examplesFor(entry, paintings) {
  return paintings.filter((p) => (entry.style && p.style === entry.style) || (entry.medium && p.medium === entry.medium) || (entry.surface && p.surface === entry.surface));
}

function paintingFact(p) {
  return `${p.slug}: "${p.title}" by ${p.artist?.name}, ${p.year}. ${p.category}, ${p.style}, ${p.medium} on ${String(p.surface).toLowerCase()}, mood ${p.mood}. ${p.summary || ''}`.trim();
}

// Our own answer, always worked out first from the database. The model only rewrites the text.
async function ruleAnswer(message, { contextPainting, contextQuery, last, paintings, artists }) {
  const text = message.toLowerCase().trim();
  const facts = [];

  if (/^(hi|hello|hey|good (morning|afternoon|evening))\b/.test(text) && text.split(' ').length <= 4) {
    return { text: 'Hello. Ask me about any painting, artist or style, or tell me what you would like to see.', paintings: [], followUps: SUGGESTIONS.slice(0, 3), facts };
  }

  const help = PAGE_HELP.find((h) => h.pattern.test(text));
  if (help && /(how|where|can i|do i|what is the|page)/.test(text)) {
    return { text: help.text, paintings: [], followUps: help.followUps, facts: [help.text] };
  }

  const mediums = ['oil', 'tempera', 'acrylic', 'gouache', 'watercolour', 'watercolor', 'charcoal', 'pastel']
    .filter((m) => text.includes(m)).map((m) => (m === 'watercolor' ? 'watercolour' : m));
  const pair = [...new Set(mediums)].sort();
  if (pair.length === 2 && /(difference|\bor\b|versus|\bvs\b|compare)/.test(text) && COMPARE[pair.join(' ')]) {
    const examples = paintings.filter((p) => pair.includes(p.medium.toLowerCase()));
    return { text: COMPARE[pair.join(' ')], paintings: examples.slice(0, 3), followUps: [`Show all ${pair[0]} paintings`, `Show all ${pair[1]} paintings`], facts: [COMPARE[pair.join(' ')]] };
  }

  const chips = await understandWithRules(text);
  if (/most/.test(text) && /artist|who/.test(text) && chips.some((c) => c.type === 'category' || c.type === 'keyword')) {
    const matching = await runSearch(chips, { all: paintings });
    const counts = new Map();
    for (const p of matching) counts.set(p.artist?.name, (counts.get(p.artist?.name) || 0) + 1);
    const [top] = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    if (top) {
      const theirs = matching.filter((p) => p.artist?.name === top[0]);
      return {
        text: `${top[0]} has the most in ArtMind, with ${top[1]}. Here they are.`,
        paintings: theirs.slice(0, 3),
        followUps: [`Tell me about ${top[0]}`, 'Similar artists', 'More like these'],
        facts: [`${top[0]} has ${top[1]} matching paintings.`],
      };
    }
  }

  if (/^(more like (these|this|that)|show me more|similar)/.test(text) && (last[0] || contextPainting)) {
    const base = last[0] || contextPainting;
    const more = await similarTo(base, 3, { exclude: last.map((p) => p.slug), all: paintings });
    return { text: 'Here are a few more in the same spirit.', paintings: more, followUps: ['Explain the style', 'Only watercolours'], facts: [] };
  }

  if (/(explain the style|this style|what style|which style)/.test(text) && (last[0] || contextPainting)) {
    const painting = contextPainting && /this/.test(text) && !last.length ? contextPainting : last[0] || contextPainting;
    const entry = GLOSSARY[painting.style.toLowerCase()];
    if (entry) {
      return { text: entry.text, paintings: examplesFor(entry, paintings).filter((p) => p.slug !== painting.slug).slice(0, 3), followUps: ['More like these', 'Who paints like this?'], facts: [entry.text] };
    }
  }

  const pool = last.length ? last : [];
  if (pool.length && /(these|them|which of|only|of those)/.test(text) && chips.some((c) => c.type !== 'keyword')) {
    const matching = await runSearch(chips, { all: paintings });
    const kept = pool.filter((p) => matching.some((m) => m.slug === p.slug));
    if (kept.length) {
      return { text: kept.length === 1 ? 'Just this one:' : `${kept.length === 2 ? 'Two' : kept.length} good ones to start with:`, paintings: kept.slice(0, 3), followUps: ['More like these', 'What is a wash?', 'Similar artists'], facts: [] };
    }
    if (matching.length) {
      return { text: 'None of those, but these fit what you asked for:', paintings: matching.slice(0, 3), followUps: ['More like these', 'Explain the style'], facts: [] };
    }
  }

  const glossaryKey = /(what is|what's|what are|explain|tell me about|meaning of|define|how does|in simple words)/.test(text) ? findGlossary(text) : null;
  if (glossaryKey) {
    const entry = GLOSSARY[glossaryKey];
    return { text: entry.text, paintings: examplesFor(entry, paintings).slice(0, 3), followUps: ['More like these', 'Who paints like this?'], facts: [entry.text] };
  }

  const artistChip = chips.find((c) => c.type === 'artist');
  if (artistChip && /(who|tell me|about|bio|life|similar)/.test(text)) {
    const artist = artists.find((a) => a.name === artistChip.value);
    const theirs = paintings.filter((p) => p.artist?.name === artist.name);
    const bio = String(artist.bio || '').split('\n\n')[0];
    return { text: bio, paintings: theirs.slice(0, 3), followUps: ['More like these', 'Similar artists'], facts: [bio, `${artist.name} is from ${artist.country}, born ${artist.bornYear}.`] };
  }

  if (contextPainting && (/\b(this|it|painting|here)\b/.test(text) || !chips.length)) {
    const p = contextPainting;
    return {
      text: `${p.title} was painted by ${p.artist?.name} in ${p.year}. It is ${p.style.toLowerCase()}, ${p.medium.toLowerCase()} on ${p.surface.toLowerCase()}. ${p.summary || ''}`.trim(),
      paintings: await similarTo(p, 3, { all: paintings }),
      followUps: ['Explain the style', 'More like these'],
      facts: [paintingFact(p), p.description || ''],
    };
  }

  let searchChips = chips;
  if (!chips.length && contextQuery) searchChips = await understandWithRules(contextQuery);
  if (searchChips.length) {
    const results = await runSearch(searchChips, { all: paintings });
    if (results.length) {
      const phrase = message.replace(/^(show me|find|i want|i would like|looking for|can you show me)\s+/i, '').replace(/[?.!]+$/, '');
      return {
        text: `Here are some ${phrase.charAt(0).toLowerCase()}${phrase.slice(1)}. ${results.length > 3 ? `There are ${results.length} in all.` : ''}`.trim(),
        paintings: results.slice(0, 3),
        followUps: ['More like these', chips.some((c) => c.type === 'medium') ? 'Explain the style' : 'Only watercolours', 'Explain the style'],
        facts: [`${results.length} paintings match.`],
      };
    }
  }

  return {
    text: 'I can help with paintings, artists, styles and techniques in the ArtMind collection. Try asking about a style, a medium or the kind of painting you would like to see.',
    paintings: [],
    followUps: SUGGESTIONS.slice(0, 3),
    facts: [],
  };
}

const SYSTEM = `You are the ArtMind gallery guide. ArtMind is an online painting gallery. Answer in plain, friendly British English in at most four short sentences.
Use only the facts and paintings given to you. Only recommend ArtMind paintings from the list, never other artworks or websites.
If the question is not about paintings, artists, styles, techniques or using the ArtMind site, say politely that you can only help with those.
Answer with JSON only, no other text: {"text": "...", "paintings": ["slug"], "followUps": ["short question", "short question"]}.
paintings holds up to 3 slugs from the list. followUps holds 2 or 3 short questions the visitor could ask next.`;

async function writeWithModel(message, draft, { history, candidates, contextPainting }) {
  const listed = [...new Map([...draft.paintings, ...candidates, ...(contextPainting ? [contextPainting] : [])].map((p) => [p.slug, p])).values()].slice(0, 8);
  const facts = [
    draft.facts?.filter(Boolean).length ? `Facts: ${draft.facts.filter(Boolean).join(' ')}` : '',
    `Our draft answer: ${draft.text}`,
    `Paintings you may use:\n${listed.map(paintingFact).join('\n') || 'none'}`,
    'Pages on the site: Gallery, Collections, Artists, Identify a style (upload a photo), Assistant, Favourites, Dashboard, Profile, Contact.',
  ].filter(Boolean).join('\n\n');
  const messages = [
    { role: 'system', content: `${SYSTEM}\n\n${facts}` },
    ...history.slice(-10).map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.text).slice(0, 1000) })),
    { role: 'user', content: message },
  ];
  const reply = await chatJson(messages, { timeoutMs: TIMEOUTS.assistant });
  if (!reply || typeof reply.text !== 'string' || !reply.text.trim()) return null;
  const bySlug = new Map(listed.map((p) => [p.slug, p]));
  const chosen = (Array.isArray(reply.paintings) ? reply.paintings : []).map((s) => bySlug.get(String(s))).filter(Boolean);
  return {
    text: reply.text.trim().slice(0, 1500),
    paintings: chosen.length || !draft.paintings.length ? chosen : draft.paintings,
    followUps: Array.isArray(reply.followUps) ? reply.followUps.map((f) => String(f).trim().slice(0, 60)).filter(Boolean) : [],
  };
}

export async function answer({ message, context = {}, history = [], useModel = true }) {
  const [paintings, artists] = await Promise.all([loadPaintings(), Artist.find({}).lean()]);
  const bySlug = new Map(paintings.map((p) => [p.slug, p]));
  const contextPainting = context.paintingSlug ? bySlug.get(context.paintingSlug) || null : null;
  const lastAssistant = [...history].reverse().find((m) => m.role === 'assistant' && m.paintings?.length);
  let last = (lastAssistant?.paintings || []).map((p) => bySlug.get(typeof p === 'string' ? p : p?.slug)).filter(Boolean);
  if (!last.length && context.query) last = (await runSearch(await understandWithRules(context.query), { all: paintings })).slice(0, 6);

  const draft = await ruleAnswer(message, { contextPainting, contextQuery: context.query, last, paintings, artists });
  let final = draft;
  if (useModel && isAvailable()) {
    const chips = await understandWithRules(message);
    const candidates = draft.paintings.length ? [] : (await runSearch(chips, { all: paintings })).slice(0, 5);
    const written = await writeWithModel(message, draft, { history, candidates, contextPainting });
    if (written) final = { ...written, followUps: written.followUps.length >= 2 ? written.followUps : draft.followUps };
  }

  const cards = final.paintings.filter((p) => bySlug.has(p.slug)).slice(0, 3);
  let followUps = uniqueFollowUps(final.followUps);
  if (followUps.length < 2) followUps = uniqueFollowUps([...followUps, ...SUGGESTIONS]).slice(0, 3);
  return { text: final.text, paintings: cards.map(toCard), followUps };
}
