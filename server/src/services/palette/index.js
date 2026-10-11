import sharp from 'sharp';
import { COLOUR_GROUPS } from '../../config/constants.js';

const toHex = ([r, g, b]) => `#${[r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('').toUpperCase()}`;

export function hexToRgb(hex) {
  const n = parseInt(String(hex).slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHsl(r, g, b) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return [h * 60, s, l];
}

// The twelve gallery swatches. Ochre is the yellow key, olive is green, navy is blue and purple is violet.
export function colourBucket(r, g, b) {
  const [h, s, l] = rgbToHsl(r, g, b);
  if (l < 0.13) return 'black';
  if (l > 0.78 && (s < 0.5 || (h >= 20 && h <= 70))) return 'cream';
  if (s < 0.12) return 'grey';
  if (h >= 12 && h < 48 && l < 0.4) return 'brown';
  if (h >= 300 || h < 12) return (l > 0.6 || (h >= 300 && h < 345)) ? 'pink' : 'red';
  if (h < 38) return 'orange';
  if (h < 68) return 'yellow';
  if (h < 160) return 'green';
  if (h < 200) return 'teal';
  if (h < 255) return 'blue';
  return 'violet';
}

export const COLOUR_KEYS = COLOUR_GROUPS.map((c) => c.key);

export function colourDistance(a, b) {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return Math.sqrt((r1 - r2) ** 2 * 0.3 + (g1 - g2) ** 2 * 0.59 + (b1 - b2) ** 2 * 0.11);
}

// Average distance from each colour in one palette to its closest colour in the other, from 0 to about 1.
export function paletteDistance(a = [], b = []) {
  if (!a.length || !b.length) return 1;
  const one = a.reduce((sum, colour) => sum + Math.min(...b.map((other) => colourDistance(colour, other))), 0) / a.length;
  return Math.min(1, one / 255);
}

function kMeans(pixels, k) {
  const count = pixels.length / 3;
  const centres = [];
  const first = Math.floor(count / 2) * 3;
  centres.push([pixels[first], pixels[first + 1], pixels[first + 2]]);
  const nearest = new Float64Array(count).fill(Infinity);
  while (centres.length < k) {
    const last = centres[centres.length - 1];
    let best = 0;
    let bestIndex = 0;
    for (let i = 0; i < count; i += 1) {
      const d = (pixels[i * 3] - last[0]) ** 2 + (pixels[i * 3 + 1] - last[1]) ** 2 + (pixels[i * 3 + 2] - last[2]) ** 2;
      if (d < nearest[i]) nearest[i] = d;
      if (nearest[i] > best) {
        best = nearest[i];
        bestIndex = i;
      }
    }
    centres.push([pixels[bestIndex * 3], pixels[bestIndex * 3 + 1], pixels[bestIndex * 3 + 2]]);
  }

  const assigned = new Uint8Array(count);
  for (let round = 0; round < 12; round += 1) {
    const sums = centres.map(() => [0, 0, 0, 0]);
    for (let i = 0; i < count; i += 1) {
      let best = Infinity;
      let which = 0;
      for (let c = 0; c < k; c += 1) {
        const d = (pixels[i * 3] - centres[c][0]) ** 2 + (pixels[i * 3 + 1] - centres[c][1]) ** 2 + (pixels[i * 3 + 2] - centres[c][2]) ** 2;
        if (d < best) {
          best = d;
          which = c;
        }
      }
      assigned[i] = which;
      sums[which][0] += pixels[i * 3];
      sums[which][1] += pixels[i * 3 + 1];
      sums[which][2] += pixels[i * 3 + 2];
      sums[which][3] += 1;
    }
    sums.forEach((s, c) => {
      if (s[3]) centres[c] = [s[0] / s[3], s[1] / s[3], s[2] / s[3]];
    });
  }
  const sizes = centres.map(() => 0);
  for (const a of assigned) sizes[a] += 1;
  return centres.map((rgb, i) => ({ rgb, size: sizes[i] })).filter((c) => c.size > 0).sort((a, b) => b.size - a.size);
}

function measure(pixels, width, height) {
  const count = width * height;
  let bright = 0;
  let sat = 0;
  let warm = 0;
  const lum = new Float64Array(count);
  const buckets = Object.fromEntries(COLOUR_KEYS.map((k) => [k, 0]));
  let chromatic = 0;
  let hueX = 0;
  let hueY = 0;
  for (let i = 0; i < count; i += 1) {
    const r = pixels[i * 3];
    const g = pixels[i * 3 + 1];
    const b = pixels[i * 3 + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    lum[i] = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    bright += lum[i];
    sat += max ? (max - min) / max : 0;
    if (r > b + 15) warm += 1;
    buckets[colourBucket(r, g, b)] += 1;
    if (max - min > 30 && max > 40 && max < 245) {
      const [h] = rgbToHsl(r, g, b);
      chromatic += 1;
      hueX += Math.cos((h * Math.PI) / 180);
      hueY += Math.sin((h * Math.PI) / 180);
    }
  }
  const brightness = bright / count;
  let variance = 0;
  for (let i = 0; i < count; i += 1) variance += (lum[i] - brightness) ** 2;

  let edges = 0;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x;
      edges += Math.abs(lum[i + 1] - lum[i - 1]) + Math.abs(lum[i + width] - lum[i - width]);
    }
  }
  const shares = Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, v / count]));
  return {
    brightness,
    saturation: sat / count,
    contrast: Math.sqrt(variance / count),
    edges: edges / Math.max(1, (width - 2) * (height - 2)),
    warmth: warm / count,
    chromaticShare: chromatic / count,
    hueFocus: chromatic ? Math.hypot(hueX, hueY) / chromatic : 1,
    colourShares: shares,
  };
}

export async function analyseImage(input) {
  const image = sharp(input, { failOn: 'error' }).rotate();
  const meta = await image.metadata();
  const { data, info } = await image.clone().removeAlpha().resize(96, 96, { fit: 'inside' }).raw().toBuffer({ resolveWithObject: true });
  const clusters = kMeans(data, 6);
  const palette = clusters.map((c) => toHex(c.rgb));
  while (palette.length && palette.length < 6) palette.push(palette[palette.length - 1]);
  const stats = measure(data, info.width, info.height);
  const dominantColour = Object.entries(stats.colourShares).sort((a, b) => b[1] - a[1])[0][0];
  const colourGroups = Object.entries(stats.colourShares).filter(([, share]) => share >= 0.12).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);
  const width = meta.autoOrient?.width || meta.width;
  const height = meta.autoOrient?.height || meta.height;
  return {
    palette,
    tones: palette.slice(0, 3),
    dominantColour,
    colourGroups: colourGroups.length ? colourGroups : [dominantColour],
    stats,
    width,
    height,
    orientation: width === height ? 'square' : width > height ? 'landscape' : 'portrait',
  };
}

export async function analyseFile(filePath) {
  try {
    return await analyseImage(filePath);
  } catch (err) {
    console.warn(`[palette] Could not read ${filePath}: ${err.message}`);
    return null;
  }
}
