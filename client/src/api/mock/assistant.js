import { artistBySlug, db, paintingBySlug, toCard } from './db.js';
import { runSearch, similarTo, understand } from './logic.js';

export const SUGGESTIONS = [
  'Explain impressionism in simple words',
  'Show me calm paintings for a bedroom',
  'What is gold leaf?',
  'Find religious paintings on wood panel',
  'Oil or tempera, what is the difference?',
  'Which artist painted the most birds?',
];

const GLOSSARY = {
  impressionism: { style: 'Impressionism', text: 'Impressionism is about catching a moment of light. Painters use short, broken brush strokes and fresh colour instead of smooth blending, so up close you see dabs of paint and from a distance they melt into water, sky and leaves.' },
  realism: { style: 'Realism', text: 'Realism shows people and places as they really look, without making them grander or prettier. The painter pays close attention to light, weight and texture.' },
  expressionism: { style: 'Expressionism', text: 'Expressionism puts feeling first. Colours are stronger and shapes are pushed or simplified so the painting shows how a moment felt, not only how it looked.' },
  'abstract expressionism': { style: 'Abstract expressionism', text: 'Abstract expressionism uses big gestures, layers and texture with no recognisable subject. The marks themselves carry the energy of the painting.' },
  'colour field': { style: 'Colour field', text: 'Colour field painting uses large, calm areas of colour. Soft edges and thin layers make the colours seem to glow and float.' },
  'geometric abstraction': { style: 'Geometric abstraction', text: 'Geometric abstraction builds a picture from flat shapes such as squares, bands and folds, with crisp edges and careful balance.' },
  'ink wash': { style: 'Ink wash', text: 'Ink wash painting comes from East Asia. The painter uses black ink thinned with water to make many shades of grey, and leaves a lot of the paper empty.' },
  'still life': { style: 'Still life', text: 'A still life is a painting of objects that do not move, such as flowers, jugs and fruit, arranged and studied closely.' },
  'renaissance revival': { style: 'Renaissance revival', text: 'Renaissance revival painters work in the manner of fifteenth century Italian artists: egg tempera on wooden panels, fine detail and real gold leaf.' },
  'baroque revival': { style: 'Baroque revival', text: 'Baroque revival paintings use deep darkness and a single strong light, which makes the scene feel dramatic and close.' },
  folk: { style: 'Folk', text: 'Folk painting draws on traditional patterns and festival decoration. It uses flat, bright colour and simple, repeated shapes.' },
  contemporary: { style: 'Contemporary', text: 'Contemporary here means painting by living artists working today, often with bold colour and a personal take on familiar subjects.' },
  'gold leaf': { medium: 'Tempera', text: 'Gold leaf is real gold beaten into sheets thinner than paper. Painters lay it on a sticky ground and polish it, so the background shines when the light moves.' },
  oil: { medium: 'Oil', text: 'Oil paint is pigment mixed with oil. It dries slowly, so painters can blend it or build it up thickly, and it keeps a rich, deep colour.' },
  acrylic: { medium: 'Acrylic', text: 'Acrylic paint dries fast and stays bright. It can be thin like watercolour or thick like oil.' },
  watercolour: { medium: 'Watercolour', text: 'Watercolour is pigment carried in water. It is see through, so the white of the paper shows through and becomes the light in the painting.' },
  gouache: { medium: 'Gouache', text: 'Gouache is like watercolour but opaque. It dries flat and matt, which suits clean shapes and patterns.' },
  pastel: { medium: 'Pastel', text: 'Pastel is pure pigment pressed into a stick. It gives soft, powdery colour and is usually used on toned paper.' },
  charcoal: { medium: 'Charcoal', text: 'Charcoal is burnt wood used for drawing. It makes rich blacks and soft greys that can be smudged with a finger.' },
  tempera: { medium: 'Tempera', text: 'Egg tempera is pigment mixed with egg yolk. It dries quickly in fine, matt layers and was the main paint before oil.' },
  wash: { style: 'Ink wash', text: 'A wash is a thin layer of watery ink or paint spread across the paper. Layering washes builds depth from pale to dark.' },
};

const COMPARE = {
  'oil tempera': 'Tempera is pigment mixed with egg yolk. It dries in minutes, so painters work in fine, small strokes and build up thin layers. Oil dries slowly, which lets painters blend colours on the canvas and paint thickly. Tempera looks matt and crisp, oil looks deeper and glossier.',
  'acrylic oil': 'Acrylic dries in minutes and can be cleaned with water. Oil stays wet for days, so it blends more softly. Acrylic colours stay bright, oil colours have a deeper glow.',
  'gouache watercolour': 'Both use water. Watercolour is see through, so the paper shines through it. Gouache is opaque and dries flat and matt.',
};

const cards = (paintings, n = 3) => paintings.slice(0, n).map(toCard);

function findGlossary(text) {
  const keys = Object.keys(GLOSSARY).sort((a, b) => b.length - a.length);
  return keys.find((k) => text.includes(k) || (k === 'impressionism' && text.includes('impressionist')) || (k === 'watercolour' && text.includes('watercolor')));
}

function examplesFor(entry) {
  return db().paintings.filter((p) => (entry.style && p.style === entry.style) || (entry.medium && p.medium === entry.medium));
}

export function reply(message, { context = {}, lastSlugs = [] } = {}) {
  const text = message.toLowerCase().trim();
  const last = lastSlugs.map(paintingBySlug).filter(Boolean);
  const contextPainting = context.paintingSlug ? paintingBySlug(context.paintingSlug) : null;

  if (/^(hi|hello|hey|good (morning|afternoon|evening))\b/.test(text)) {
    return { text: 'Hello. Ask me about any painting, artist or style, or tell me what you would like to see.', paintings: [], followUps: SUGGESTIONS.slice(0, 3) };
  }

  const mediums = ['oil', 'tempera', 'acrylic', 'gouache', 'watercolour'].filter((m) => text.includes(m));
  if (mediums.length === 2 && /(difference|or|versus|vs)/.test(text)) {
    const key = [...mediums].sort().join(' ');
    if (COMPARE[key]) {
      const examples = db().paintings.filter((p) => mediums.some((m) => p.medium.toLowerCase() === m));
      return { text: COMPARE[key], paintings: cards(examples, 3), followUps: [`Show all ${mediums[0]} paintings`, `Show all ${mediums[1]} paintings`] };
    }
  }

  if (/most (birds|flowers|landscapes|portraits|religious)/.test(text) && /artist/.test(text)) {
    const chips = understand(text);
    const matching = runSearch(chips);
    const counts = {};
    for (const p of matching) counts[p.artistSlug] = (counts[p.artistSlug] || 0) + 1;
    const [top] = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (top) {
      const artist = artistBySlug(top[0]);
      const theirs = matching.filter((p) => p.artistSlug === top[0]);
      return { text: `${artist.name} has the most in ArtMind, with ${top[1]}. Here they are.`, paintings: cards(theirs, 4), followUps: [`Tell me about ${artist.name}`, 'Similar artists'] };
    }
  }

  if (text.startsWith('more like these') && last.length) {
    const more = similarTo(last[0], 6, last.map((p) => p.slug));
    return { text: 'Here are a few more in the same spirit.', paintings: cards(more, 3), followUps: ['Explain the style', 'Only watercolours'] };
  }

  if ((text.startsWith('explain the style') || text.includes('this style')) && (last[0] || contextPainting)) {
    const painting = last[0] || contextPainting;
    const entry = GLOSSARY[painting.style.toLowerCase()];
    if (entry) return { text: entry.text, paintings: cards(examplesFor(entry).filter((p) => p.slug !== painting.slug), 3), followUps: ['More like these'] };
  }

  const chips = understand(text);
  if (last.length && /(these|them|which of|only)/.test(text) && chips.length) {
    const kept = last.filter((p) => runSearch(chips).includes(p));
    if (kept.length) {
      return { text: kept.length === 1 ? 'Just this one:' : `${kept.length === 2 ? 'Two' : kept.length} good ones to start with:`, paintings: cards(kept, 4), followUps: ['Show all watercolours', 'What is a wash?', 'Similar artists'] };
    }
  }

  const glossaryKey = /(what is|what's|explain|tell me about|meaning of|what are)/.test(text) ? findGlossary(text) : null;
  if (glossaryKey) {
    const entry = GLOSSARY[glossaryKey];
    return { text: entry.text, paintings: cards(examplesFor(entry), 3), followUps: ['More like these', 'Who paints like this?'] };
  }

  const artistChip = chips.find((c) => c.type === 'artist');
  if (artistChip && /(who|tell me|about|bio|life)/.test(text)) {
    const artist = db().artists.find((a) => a.name === artistChip.value);
    const theirs = db().paintings.filter((p) => p.artistSlug === artist.slug);
    return { text: artist.bio.split('\n\n')[0], paintings: cards(theirs, 3), followUps: ['More like these', 'Similar artists'] };
  }

  if (contextPainting && (/(this|it|painting)/.test(text) || !chips.length)) {
    const artist = artistBySlug(contextPainting.artistSlug);
    return {
      text: `${contextPainting.title} was painted by ${artist?.name} in ${contextPainting.year}. It is ${contextPainting.style.toLowerCase()}, ${contextPainting.medium.toLowerCase()} on ${contextPainting.surface.toLowerCase()}. ${contextPainting.summary}`,
      paintings: cards(similarTo(contextPainting, 3), 3),
      followUps: ['Explain the style', 'More like these'],
    };
  }

  if (chips.length) {
    const results = runSearch(chips);
    if (results.length) {
      const phrase = message.replace(/^(show me|find|i want|i would like|looking for)\s+/i, '').replace(/[?.!]+$/, '');
      return {
        text: `Here are some ${phrase.charAt(0).toLowerCase()}${phrase.slice(1)}. ${results.length > 3 ? `There are ${results.length} in all.` : ''}`.trim(),
        paintings: cards(results, 3),
        followUps: ['More like these', chips.some((c) => c.type === 'medium') ? 'Explain the style' : 'Only watercolours', 'Explain the style'].filter((v, i, a) => a.indexOf(v) === i),
      };
    }
  }

  return {
    text: 'I can help with paintings, artists, styles and techniques in the ArtMind collection. Try asking about a style, a medium or the kind of painting you would like to see.',
    paintings: [],
    followUps: SUGGESTIONS.slice(0, 3),
  };
}

export function titleFor(message) {
  const clean = message.replace(/[?.!]+$/, '').trim();
  return clean.length > 48 ? `${clean.slice(0, 45)}...` : clean.charAt(0).toUpperCase() + clean.slice(1);
}
