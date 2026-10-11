import { CATEGORIES, COLOUR_GROUPS, MEDIUMS, MOODS, STYLES, SURFACES } from '../../config/constants.js';
import { Artist, Painting } from '../../models/index.js';

// Words people use, mapped to the values we store. Values that stand for a set use a group.
export const SYNONYMS = {
  category: {
    Abstract: ['abstract', 'abstraction', 'abstracts', 'non figurative'],
    Landscape: ['landscape', 'landscapes', 'scenery', 'countryside', 'hills', 'valley', 'river', 'lake', 'harbour', 'village', 'seascape'],
    Flower: ['flower', 'flowers', 'floral', 'blossom', 'blossoms', 'bouquet', 'roses', 'lilies', 'garden flowers'],
    Nature: ['nature', 'bird', 'birds', 'animal', 'animals', 'wildlife', 'forest', 'trees', 'leaves', 'fish'],
    Figurative: ['figurative', 'people', 'person', 'portrait', 'portraits', 'figure', 'figures', 'woman', 'women', 'man', 'men', 'faces'],
    Religious: ['religious', 'sacred', 'holy', 'faith', 'bible', 'biblical', 'saint', 'saints', 'angel', 'angels', 'devotion', 'christian', 'spiritual'],
  },
  style: {
    Impressionism: ['impressionism', 'impressionist', 'impressionistic'],
    Realism: ['realism', 'realist', 'realistic', 'lifelike'],
    Expressionism: ['expressionism', 'expressionist'],
    'Abstract expressionism': ['abstract expressionism', 'abstract expressionist'],
    'Colour field': ['colour field', 'color field'],
    'Geometric abstraction': ['geometric abstraction', 'geometric'],
    'Ink wash': ['ink wash', 'sumi', 'sumi e'],
    'Still life': ['still life', 'still lifes'],
    Contemporary: ['contemporary'],
    Modern: ['modern', 'modern art'],
    Folk: ['folk'],
    'Renaissance revival': ['renaissance revival', 'renaissance'],
    'Baroque revival': ['baroque revival', 'baroque'],
  },
  medium: {
    Oil: ['oil', 'oils', 'oil paint'],
    Acrylic: ['acrylic', 'acrylics'],
    Watercolour: ['watercolour', 'watercolours', 'watercolor', 'watercolors', 'water colour'],
    Gouache: ['gouache'],
    Ink: ['ink'],
    Pastel: ['pastel', 'pastels'],
    Charcoal: ['charcoal'],
    Tempera: ['tempera', 'egg tempera'],
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
    Calm: ['calm', 'peaceful', 'quiet', 'serene', 'still', 'relaxing', 'tranquil', 'soft light'],
    Dramatic: ['dramatic', 'stormy', 'intense'],
    Energetic: ['energetic', 'lively', 'dynamic', 'movement'],
    Joyful: ['joyful', 'happy', 'cheerful', 'bright', 'sunny'],
    Melancholic: ['melancholic', 'melancholy', 'sad', 'wistful'],
    Solemn: ['solemn', 'serious', 'grave'],
    Tender: ['tender', 'gentle', 'loving'],
  },
  colour: {
    warm: ['warm colours', 'warm colors', 'warm tones', 'warm'],
    cool: ['cool colours', 'cool colors', 'cool tones', 'cool'],
    red: ['red', 'reds', 'crimson', 'scarlet'],
    orange: ['orange', 'oranges'],
    yellow: ['ochre', 'yellow', 'yellows', 'gold', 'golden'],
    green: ['olive', 'green', 'greens'],
    teal: ['teal', 'turquoise'],
    blue: ['navy', 'blue', 'blues', 'cobalt', 'indigo'],
    violet: ['purple', 'violet', 'lilac'],
    pink: ['pink', 'pinks', 'rose'],
    cream: ['cream', 'white', 'ivory'],
    grey: ['grey', 'gray', 'silver'],
    brown: ['brown', 'browns', 'earthy'],
    black: ['black', 'dark'],
  },
};

// Group values match several stored values.
export const GROUPS = {
  'colour:warm': (p) => ['red', 'orange', 'yellow'].some((c) => coloursOf(p).includes(c)),
  'colour:cool': (p) => ['teal', 'blue', 'grey'].some((c) => coloursOf(p).includes(c)),
  'style:Modern': (p) => p.style === 'Contemporary' || p.category === 'Abstract',
};

export function coloursOf(p) {
  return [...new Set([...(p.colourGroups || []), p.dominantColour].filter(Boolean))];
}

export const STOP_WORDS = new Set(('a an and the of in on with by for to me some show find any paintings painting art works work that is are i '
  + 'want like from at or about please something which who what my see look looking themes theme pictures picture '
  + 'pieces piece images image style styles colours colors done made using kind sort really very lot lots most more').split(' '));

export const LABELS = { category: 'Category', style: 'Style', medium: 'Medium', surface: 'Surface', colour: 'Colour', mood: 'Mood', artist: 'Artist', year: 'Years', keyword: 'Keyword' };
export const TYPE_ORDER = ['category', 'style', 'medium', 'surface', 'colour', 'mood', 'artist', 'year', 'keyword'];

export function colourLabel(value) {
  if (value === 'warm') return 'Warm';
  if (value === 'cool') return 'Cool';
  return COLOUR_GROUPS.find((c) => c.key === value)?.label || value;
}

let cached = null;
let cachedAt = 0;

export function forgetVocabulary() {
  cached = null;
}

export async function vocabulary() {
  if (cached && Date.now() - cachedAt < 5 * 60 * 1000) return cached;
  const [artists, styles, tagRows] = await Promise.all([
    Artist.find({}).select('name slug').lean(),
    Painting.distinct('style'),
    Painting.find({}).select('tags title').lean(),
  ]);
  const words = {};
  for (const [type, groups] of Object.entries(SYNONYMS)) {
    words[type] = Object.fromEntries(Object.entries(groups).map(([value, list]) => [value, [...list]]));
  }
  for (const style of new Set([...STYLES, ...styles])) {
    words.style[style] ||= [style.toLowerCase()];
    if (!words.style[style].includes(style.toLowerCase())) words.style[style].push(style.toLowerCase());
  }
  for (const [type, values] of [['category', CATEGORIES], ['medium', MEDIUMS], ['surface', SURFACES], ['mood', MOODS]]) {
    for (const value of values) {
      words[type][value] ||= [];
      if (!words[type][value].includes(value.toLowerCase())) words[type][value].push(value.toLowerCase());
    }
  }
  const tagWords = new Set(tagRows.flatMap((p) => [...(p.tags || []), ...p.title.toLowerCase().split(/\s+/)]).flatMap((t) => t.toLowerCase().split(/\s+/)));
  cached = {
    words,
    artists: artists.map((a) => ({ name: a.name, slug: a.slug, parts: [a.name.toLowerCase(), ...a.name.toLowerCase().split(/\s+/)].filter((x) => x.length > 2) })),
    tagWords,
    allowed: {
      category: new Set(CATEGORIES),
      style: new Set([...Object.keys(words.style)]),
      medium: new Set(MEDIUMS),
      surface: new Set(SURFACES),
      mood: new Set(MOODS),
      colour: new Set(Object.keys(words.colour)),
      artist: new Set(artists.map((a) => a.name)),
    },
  };
  cachedAt = Date.now();
  return cached;
}
