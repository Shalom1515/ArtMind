import { Painting } from '../../models/index.js';
import { analyseImage, paletteDistance } from '../palette/index.js';
import { classify, cosine, embed, embedFile, isModelReady, loadModel, modelStatus } from './model.js';

export { embed, embedFile, isModelReady, loadModel, modelStatus };

const NEIGHBOURS = 7;
const SHARPNESS = 0.05;
const TEXTURE_NEIGHBOURS = 5;
// Weights found with a leave one out check over the 60 gallery paintings.
const TEXTURE_WEIGHT = 0.7;
const HINT_WEIGHT = 1.5;

// Some ImageNet labels say a lot about the subject, which helps when the gallery has no close match yet.
const SUBJECT_HINTS = [
  { category: 'Flower', pattern: /\b(vase|pot, flowerpot|daisy|lady's slipper|rose hip|cardoon|rapeseed|bouquet|picket fence)\b/i },
  { category: 'Nature', pattern: /\b(bird|finch|robin|jay|magpie|eagle|owl|heron|egret|crane|stork|flamingo|pelican|goose|swan|drake|spoonbill|bittern|kingfisher|hornbill|peacock|parrot|macaw|goldfish|tench|frog|turtle|butterfly|dragonfly|bee|tiger|lion|elephant|zebra|monkey|fox|wolf)\b/i },
  { category: 'Landscape', pattern: /\b(hay|thatch|barn|valley|alp|lakeside|seashore|promontory|cliff|volcano|sandbar|boathouse|dock|breakwater|viaduct|pier|canoe|gondola|fireboat)\b/i },
  { category: 'Religious', pattern: /\b(vestment|altar|stole|bell cote|monastery|church|mosque|stupa|throne)\b/i },
];

const STYLE_NOTES = {
  Impressionism: 'Short broken brush strokes',
  Realism: 'Careful, true to life modelling of form',
  Expressionism: 'Bold colour pushed for feeling',
  'Abstract expressionism': 'Loose, gestural marks without a subject',
  'Colour field': 'Large calm areas of colour',
  'Geometric abstraction': 'Flat shapes with hard edges',
  'Ink wash': 'Washes of ink with open paper',
  'Still life': 'Objects arranged and studied closely',
  Contemporary: 'Bold, modern handling of a familiar subject',
  Folk: 'Flat, bright decorative colour',
  'Renaissance revival': 'Gold tones and fine detail, like an old panel painting',
  'Baroque revival': 'Deep darkness with a single strong light',
};

let vectors = null;
let vectorsAt = 0;

export function forgetPaintingVectors() {
  vectors = null;
}

async function paintingVectors() {
  if (vectors && Date.now() - vectorsAt < 10 * 60 * 1000) return vectors;
  vectors = await Painting.find({}).select('+embedding slug category style mood medium palette tones measures').lean();
  vectorsAt = Date.now();
  return vectors;
}

export async function nearestByEmbedding(embedding, { limit = NEIGHBOURS, exclude = [] } = {}) {
  const all = await paintingVectors();
  return all
    .filter((p) => p.embedding?.length && !exclude.includes(p.slug))
    .map((p) => ({ painting: p, score: cosine(embedding, p.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

const textureOf = (m) => [m.flatness * 2, m.edges * 4, m.saturation, m.contrast * 2, m.brightness];

// Neighbours by texture: flat colour and hard edges, or fine detail, from the sharp measurements.
export function nearestByTexture(stats, all, limit = TEXTURE_NEIGHBOURS) {
  const target = textureOf(stats);
  return all
    .filter((p) => p.measures?.flatness !== undefined)
    .map((p) => ({ painting: p, distance: Math.hypot(...textureOf(p.measures).map((v, i) => v - target[i])) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
    .map((r) => ({ painting: r.painting, weight: 1 / (0.05 + r.distance) }));
}

function normalise(totals) {
  const sum = [...totals.values()].reduce((a, b) => a + b, 0) || 1;
  return new Map([...totals.entries()].map(([k, v]) => [k, v / sum]));
}

function vote(rows, read) {
  const totals = new Map();
  for (const { weight, painting } of rows) {
    const value = read(painting);
    if (value) totals.set(value, (totals.get(value) || 0) + weight);
  }
  return totals;
}

function best(totals, fallback) {
  const sum = [...totals.values()].reduce((a, b) => a + b, 0);
  const [value, score] = [...totals.entries()].sort((a, b) => b[1] - a[1])[0] || [fallback, 0];
  const share = sum ? score / sum : 0;
  return { value, share };
}

const confidence = (share) => (share >= 0.5 ? 'likely' : 'possible');

export function writeNotes(stats, style) {
  const notes = [];
  if (STYLE_NOTES[style]) notes.push(STYLE_NOTES[style]);
  const options = [
    { weight: Math.abs(stats.brightness - 0.5), text: stats.brightness > 0.62 ? 'Light and airy overall' : stats.brightness < 0.38 ? 'Deep, dark tones' : 'Even balance of light and dark' },
    { weight: Math.abs(stats.saturation - 0.35), text: stats.saturation > 0.45 ? 'Strong, saturated colour' : stats.saturation < 0.18 ? 'Very little colour, close to monochrome' : 'Soft, muted colour' },
    { weight: Math.abs(stats.edges - 0.11) * 3, text: stats.edges > 0.13 ? 'Lots of fine detail and crisp edges' : 'Soft edges and smooth blending' },
    { weight: Math.abs(stats.contrast - 0.16) * 2, text: stats.contrast > 0.2 ? 'Strong contrast between light and dark' : 'Gentle contrast with close tones' },
    { weight: Math.abs(stats.warmth - 0.5) * 0.6, text: stats.warmth > 0.6 ? 'Mostly warm colours' : stats.warmth < 0.3 ? 'Mostly cool colours' : 'Warm light against cool shadow' },
  ].sort((a, b) => b.weight - a.weight);
  for (const option of options) if (notes.length < 3) notes.push(option.text);
  return notes;
}

function rulesGuess(analysis, all) {
  const { stats } = analysis;
  const ranked = all
    .map((p) => ({ painting: p, score: 1 - paletteDistance(analysis.palette, p.palette?.length ? p.palette : p.tones) }))
    .sort((a, b) => b.score - a.score);
  const rows = ranked.slice(0, 6).map((r) => ({ ...r, weight: 1 }));
  let category = best(vote(rows, (p) => p.category), 'Landscape');
  let style = best(vote(rows, (p) => p.style), 'Impressionism');
  if (stats.chromaticShare < 0.08 && stats.brightness > 0.5) {
    style = { value: 'Ink wash', share: 0.5 };
  } else if (stats.colourShares.yellow + stats.colourShares.brown > 0.45 && stats.edges > 0.12) {
    style = { value: 'Renaissance revival', share: 0.5 };
    category = { value: 'Religious', share: 0.5 };
  }
  return { rows, category, style, ranked };
}

// Reads one uploaded image: palette and measurements from sharp, then style, category, mood and medium
// from a weighted vote of the nearest gallery paintings in MobileNet feature space.
export async function recognise(buffer, { similarCount = 4 } = {}) {
  const analysis = await analyseImage(buffer);
  const all = await paintingVectors();
  let rows;
  let category;
  let style;
  let similar;
  let usedModel = false;

  const embedding = isModelReady() ? await embed(buffer) : null;
  if (embedding) {
    usedModel = true;
    const near = await nearestByEmbedding(embedding, { limit: Math.max(NEIGHBOURS, similarCount) });
    const top = near[0]?.score || 0;
    rows = near.slice(0, NEIGHBOURS).map((r) => ({ ...r, weight: Math.exp((r.score - top) / SHARPNESS) }));
    const categoryVotes = normalise(vote(rows, (p) => p.category));
    for (const [key, value] of normalise(vote(nearestByTexture(analysis.stats, all), (p) => p.category))) {
      categoryVotes.set(key, (categoryVotes.get(key) || 0) + value * TEXTURE_WEIGHT);
    }
    for (const guess of await classify(buffer, 5)) {
      if (guess.probability < 0.25) continue;
      const hint = SUBJECT_HINTS.find((h) => h.pattern.test(guess.className));
      if (hint) categoryVotes.set(hint.category, (categoryVotes.get(hint.category) || 0) + guess.probability * HINT_WEIGHT);
    }
    category = best(categoryVotes, 'Landscape');
    const byPalette = all
      .filter((p) => p.category === category.value)
      .sort((a, b) => paletteDistance(analysis.palette, a.palette?.length ? a.palette : a.tones) - paletteDistance(analysis.palette, b.palette?.length ? b.palette : b.tones));
    const ordered = [...near.filter((r) => r.painting.category === category.value).map((r) => r.painting), ...byPalette, ...near.map((r) => r.painting)];
    similar = [...new Set(ordered.map((p) => p.slug))].slice(0, similarCount);
  } else {
    if (modelStatus() !== 'ready') console.warn('[recognition] MobileNet is not ready, so this image was read with simple rules.');
    const guess = rulesGuess(analysis, all);
    rows = guess.rows;
    category = guess.category;
    style = guess.style;
    similar = guess.ranked.slice(0, similarCount).map((r) => r.painting.slug);
  }

  // Style, mood and medium come from neighbours in the chosen category when there are any.
  const inCategory = rows.filter((r) => r.painting.category === category.value);
  let pool = inCategory.length ? inCategory : rows;
  if (!pool.length) {
    pool = all.filter((p) => p.category === category.value).map((painting) => ({ painting, weight: 1 }));
  }
  if (!style || usedModel) style = best(vote(pool, (p) => p.style), 'Impressionism');
  const mood = best(vote(pool, (p) => p.mood), 'Calm');
  const mediumVotes = vote(pool, (p) => p.medium);
  if (analysis.stats.brightness > 0.7 && analysis.stats.saturation < 0.25) mediumVotes.set('Watercolour', (mediumVotes.get('Watercolour') || 0) + 0.6);
  const medium = best(mediumVotes, 'Oil');

  const findings = {
    style: { value: style.value, confidence: 'likely' },
    category: { value: category.value, confidence: confidence(category.share) },
    mood: { value: mood.value, confidence: confidence(mood.share) },
    medium: { value: medium.value, confidence: confidence(medium.share) },
    palette: analysis.palette,
    notes: writeNotes(analysis.stats, style.value),
  };
  return {
    findings,
    similar,
    embedding,
    analysis,
    usedModel,
    searchQuery: `${mood.value} ${style.value} ${category.value}`.toLowerCase(),
  };
}
