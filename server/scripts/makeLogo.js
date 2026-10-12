import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';
import sharp from 'sharp';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const projectRoot = path.resolve(serverRoot, '..');
const p = (...parts) => path.join(projectRoot, ...parts);

const FONT_FILE = p('server', 'scripts', 'fonts', 'Newsreader-Regular.ttf');
const OUT = p('client', 'public', 'brand');

const CHARCOAL = '#1B1917';
const IVORY = '#F4EFE6';

const WORD = 'ArtMind';
const FONT_SIZE = 1000;
// Same tracking as .logo__word on the site
const LETTER_SPACING = -0.01;

// Mark proportions taken from the header in docs/designs/desktop/01_home.png
const MARK_RATIO = 0.875;
const MARK_TO_WORD = 1.46;
const GAP = 0.5;

// Line weights of option 1 in the logo sheet, as a share of the mark width
const OUTER_LINE = 0.036;
const INNER_LINE = 0.026;
const MAT = 0.06;

const PADDING = 0.1;
const LOGO_HEIGHT = 256;
const MARK_CANVAS = 1024;
const MARK_FILL = 0.875;

const n = (v) => Number(v.toFixed(2));

// One outline as a ring, so it fills cleanly with the evenodd rule
function ring(x, y, w, h, t) {
  return (
    `M${n(x)} ${n(y)}H${n(x + w)}V${n(y + h)}H${n(x)}Z` +
    `M${n(x + t)} ${n(y + t)}V${n(y + h - t)}H${n(x + w - t)}V${n(y + t)}Z`
  );
}

function markPath(x, y, height) {
  const width = height * MARK_RATIO;
  const outer = width * OUTER_LINE;
  const inset = outer + width * MAT;
  return ring(x, y, width, height, outer) + ring(x + inset, y + inset, width - inset * 2, height - inset * 2, width * INNER_LINE);
}

// The mark is drawn as rings and needs evenodd, the glyphs have overlapping contours and need nonzero
function svg(width, height, viewBox, colour, { mark, word }) {
  const body = `<path fill="${colour}" fill-rule="evenodd" d="${mark}"/>` + (word ? `<path fill="${colour}" d="${word}"/>` : '');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBox}">${body}</svg>\n`;
}

function buildLogo(font) {
  const options = { kerning: true, letterSpacing: LETTER_SPACING };
  const box = font.getPath(WORD, 0, 0, FONT_SIZE, options).getBoundingBox();

  // The mark is centred on the wordmark, from the top of the letters to the baseline
  const wordHeight = -box.y1;
  const markHeight = wordHeight * MARK_TO_WORD;
  const markWidth = markHeight * MARK_RATIO;
  const markTop = -wordHeight / 2 - markHeight / 2;

  const wordX = markWidth + markWidth * GAP - box.x1;
  const word = font.getPath(WORD, wordX, 0, FONT_SIZE, options);
  const wordBox = word.getBoundingBox();

  const top = Math.min(markTop, wordBox.y1);
  const bottom = Math.max(markTop + markHeight, wordBox.y2);
  const right = wordBox.x2;

  const contentHeight = bottom - top;
  const totalHeight = contentHeight / (1 - PADDING * 2);
  const pad = totalHeight * PADDING;
  const totalWidth = right + pad * 2;

  const viewBox = [-pad, top - pad, totalWidth, totalHeight].map(n).join(' ');
  const width = Math.round((LOGO_HEIGHT * totalWidth) / totalHeight);
  const paths = { mark: markPath(0, markTop, markHeight), word: word.toPathData({ decimalPlaces: 2, flipY: false }) };

  return (colour) => svg(width, LOGO_HEIGHT, viewBox, colour, paths);
}

function buildMark() {
  const height = MARK_CANVAS * MARK_FILL;
  const width = height * MARK_RATIO;
  const d = markPath((MARK_CANVAS - width) / 2, (MARK_CANVAS - height) / 2, height);
  return (colour) => svg(MARK_CANVAS, MARK_CANVAS, `0 0 ${MARK_CANVAS} ${MARK_CANVAS}`, colour, { mark: d });
}

async function save(name, markup) {
  await writeFile(path.join(OUT, `${name}.svg`), markup);
  await sharp(Buffer.from(markup)).png({ compressionLevel: 9 }).toFile(path.join(OUT, `${name}.png`));
  const { width, height } = await sharp(path.join(OUT, `${name}.png`)).metadata();
  console.log(`${name}.svg and ${name}.png, ${width} by ${height}`);
}

async function main() {
  const file = await readFile(FONT_FILE);
  const font = opentype.parse(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));
  await mkdir(OUT, { recursive: true });

  const logo = buildLogo(font);
  const mark = buildMark();

  await save('logo', logo(CHARCOAL));
  await save('logo_light', logo(IVORY));
  await save('logo_mark', mark(CHARCOAL));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
