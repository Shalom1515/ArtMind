export const GLOSSARY = {
  impressionism: { style: 'Impressionism', words: ['impressionism', 'impressionist'], text: 'Impressionism is about catching a moment of light. Painters use short, broken brush strokes and fresh colour instead of smooth blending, so up close you see dabs of paint and from a distance they melt into water, sky and leaves.' },
  realism: { style: 'Realism', words: ['realism', 'realist'], text: 'Realism shows people and places as they really look, without making them grander or prettier. The painter pays close attention to light, weight and texture.' },
  expressionism: { style: 'Expressionism', words: ['expressionism', 'expressionist'], text: 'Expressionism puts feeling first. Colours are stronger and shapes are pushed or simplified so the painting shows how a moment felt, not only how it looked.' },
  'abstract expressionism': { style: 'Abstract expressionism', words: ['abstract expressionism', 'abstract expressionist'], text: 'Abstract expressionism uses big gestures, layers and texture with no recognisable subject. The marks themselves carry the energy of the painting.' },
  'colour field': { style: 'Colour field', words: ['colour field', 'color field'], text: 'Colour field painting uses large, calm areas of colour. Soft edges and thin layers make the colours seem to glow and float.' },
  'geometric abstraction': { style: 'Geometric abstraction', words: ['geometric abstraction', 'geometric'], text: 'Geometric abstraction builds a picture from flat shapes such as squares, bands and folds, with crisp edges and careful balance.' },
  'ink wash': { style: 'Ink wash', words: ['ink wash', 'sumi'], text: 'Ink wash painting comes from East Asia. The painter uses black ink thinned with water to make many shades of grey, and leaves a lot of the paper empty.' },
  'still life': { style: 'Still life', words: ['still life'], text: 'A still life is a painting of objects that do not move, such as flowers, jugs and fruit, arranged and studied closely.' },
  'renaissance revival': { style: 'Renaissance revival', words: ['renaissance revival', 'renaissance'], text: 'Renaissance revival painters work in the manner of fifteenth century Italian artists: egg tempera on wooden panels, fine detail and real gold leaf.' },
  'baroque revival': { style: 'Baroque revival', words: ['baroque revival', 'baroque'], text: 'Baroque revival paintings use deep darkness and a single strong light, which makes the scene feel dramatic and close.' },
  folk: { style: 'Folk', words: ['folk art', 'folk'], text: 'Folk painting draws on traditional patterns and festival decoration. It uses flat, bright colour and simple, repeated shapes.' },
  contemporary: { style: 'Contemporary', words: ['contemporary', 'modern art'], text: 'Contemporary here means painting by living artists working today, often with bold colour and a personal take on familiar subjects.' },
  'gold leaf': { medium: 'Tempera', words: ['gold leaf', 'gilding', 'gilded'], text: 'Gold leaf is real gold beaten into sheets thinner than paper. Painters lay it on a sticky ground and polish it, so the background shines when the light moves.' },
  oil: { medium: 'Oil', words: ['oil paint', 'oil painting', 'oil'], text: 'Oil paint is pigment mixed with oil. It dries slowly, so painters can blend it or build it up thickly, and it keeps a rich, deep colour.' },
  acrylic: { medium: 'Acrylic', words: ['acrylic'], text: 'Acrylic paint dries fast and stays bright. It can be thin like watercolour or thick like oil.' },
  watercolour: { medium: 'Watercolour', words: ['watercolour', 'watercolor'], text: 'Watercolour is pigment carried in water. It is see through, so the white of the paper shows through and becomes the light in the painting.' },
  gouache: { medium: 'Gouache', words: ['gouache'], text: 'Gouache is like watercolour but opaque. It dries flat and matt, which suits clean shapes and patterns.' },
  pastel: { medium: 'Pastel', words: ['pastel'], text: 'Pastel is pure pigment pressed into a stick. It gives soft, powdery colour and is usually used on toned paper.' },
  charcoal: { medium: 'Charcoal', words: ['charcoal'], text: 'Charcoal is burnt wood used for drawing. It makes rich blacks and soft greys that can be smudged with a finger.' },
  tempera: { medium: 'Tempera', words: ['egg tempera', 'tempera'], text: 'Egg tempera is pigment mixed with egg yolk. It dries quickly in fine, matt layers and was the main paint before oil.' },
  'mixed media': { medium: 'Mixed media', words: ['mixed media'], text: 'Mixed media means the artist combines materials in one work, for example paint with sand, paper or ink.' },
  wash: { style: 'Ink wash', words: ['a wash', 'wash'], text: 'A wash is a thin layer of watery ink or paint spread across the paper. Layering washes builds depth from pale to dark.' },
  impasto: { medium: 'Oil', words: ['impasto'], text: 'Impasto is paint laid on so thickly that the brush or knife marks stand up from the surface and catch the light.' },
  glaze: { medium: 'Oil', words: ['glazing', 'glaze'], text: 'A glaze is a thin, see through layer of paint over a dry one. Several glazes give colour a deep, glowing look.' },
  chiaroscuro: { style: 'Baroque revival', words: ['chiaroscuro'], text: 'Chiaroscuro is the strong contrast of light and dark used to make figures look solid and the scene feel dramatic.' },
  'wood panel': { surface: 'Wood panel', words: ['wood panel', 'panel painting'], text: 'Before canvas became common, painters worked on wooden panels covered with smooth white gesso. Panels suit fine detail and gold leaf.' },
  canvas: { surface: 'Canvas', words: ['canvas'], text: 'Canvas is woven cotton or linen stretched over a wooden frame and primed. It is light, slightly springy and takes thick paint well.' },
  linen: { surface: 'Linen', words: ['linen'], text: 'Linen is a canvas woven from flax. It is stronger and finer than cotton and has a subtle, uneven weave many painters love.' },
};

export const COMPARE = {
  'oil tempera': 'Tempera is pigment mixed with egg yolk. It dries in minutes, so painters work in fine, small strokes and build up thin layers. Oil dries slowly, which lets painters blend colours on the canvas and paint thickly. Tempera looks matt and crisp, oil looks deeper and glossier.',
  'acrylic oil': 'Acrylic dries in minutes and can be cleaned with water. Oil stays wet for days, so it blends more softly. Acrylic colours stay bright, oil colours have a deeper glow.',
  'gouache watercolour': 'Both use water. Watercolour is see through, so the paper shines through it. Gouache is opaque and dries flat and matt.',
  'acrylic watercolour': 'Watercolour stays see through and lets the paper glow. Acrylic can be thinned like watercolour, but once dry it is waterproof and can be painted over.',
  'charcoal pastel': 'Charcoal gives blacks and greys and smudges easily. Pastel is pure coloured pigment in a stick, soft and powdery, often used on toned paper.',
};

export const PAGE_HELP = [
  { pattern: /(upload|identify|recogni[sz]e|photo of|picture of|what style is my)/, text: 'You can upload a photo on Identify a style. ArtMind suggests the likely style, category, mood and medium, shows the palette and finds similar paintings.', followUps: ['Explain impressionism in simple words', 'Show me calm paintings for a bedroom'] },
  { pattern: /(favourite|favorite|save a painting|saved paintings|heart)/, text: 'Tap the heart on any painting to save it. Your saved paintings are on the Favourites page, where you can also export them as a PDF.', followUps: ['Show me calm paintings for a bedroom', 'What is gold leaf?'] },
  { pattern: /(download|pdf|word file|docx|print)/, text: 'Every painting page has Download PDF and Download Word buttons with the image, the details and the palette.', followUps: ['Find religious paintings on wood panel', 'Explain impressionism in simple words'] },
  { pattern: /(sign up|register|create an account|log in|login|password)/, text: 'You can create an account from Register, and change your password under Profile, Security. An account lets you save favourites and get recommendations.', followUps: ['Show me calm paintings for a bedroom', 'What is gold leaf?'] },
  { pattern: /(contact|email you|get in touch|report a problem)/, text: 'You can reach the team from the Contact page. We reply within two working days.', followUps: ['Explain impressionism in simple words', 'Which artist painted the most birds?'] },
  { pattern: /(recommend|dashboard|for me|my taste)/, text: 'Your Dashboard shows paintings picked for you from what you view, save and choose as interests, with a short note on your taste.', followUps: ['Show me calm paintings for a bedroom', 'Explain impressionism in simple words'] },
  { pattern: /(collections? page|browse collections|what collections)/, text: 'The Collections page has six themed sets, from Quiet landscapes to Bold abstraction.', followUps: ['Show me calm paintings for a bedroom', 'Find religious paintings on wood panel'] },
];

export function findGlossary(text) {
  const entries = Object.entries(GLOSSARY).flatMap(([key, entry]) => entry.words.map((word) => ({ key, word })));
  entries.sort((a, b) => b.word.length - a.word.length);
  return entries.find(({ word }) => new RegExp(`\\b${word}\\b`).test(text))?.key || null;
}
