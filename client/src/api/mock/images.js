const canUseCanvas = () => typeof document !== 'undefined' && typeof createImageBitmap === 'function';

async function drawSmall(file, size) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, size / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return { canvas, ctx };
}

const toHex = (r, g, b) => `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase()}`;

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export async function readPalette(file) {
  if (!canUseCanvas() || !(file instanceof Blob)) return null;
  try {
    const { canvas, ctx } = await drawSmall(file, 72);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const buckets = new Map();
    let warm = 0;
    let bright = 0;
    let saturation = 0;
    const pixels = data.length / 4;
    for (let i = 0; i < data.length; i += 4) {
      const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
      const key = `${r >> 5},${g >> 5},${b >> 5}`;
      const bucket = buckets.get(key) || { r: 0, g: 0, b: 0, n: 0 };
      bucket.r += r;
      bucket.g += g;
      bucket.b += b;
      bucket.n += 1;
      buckets.set(key, bucket);
      if (r > b + 15) warm += 1;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      bright += max / 255;
      saturation += max ? (max - min) / max : 0;
    }
    const palette = [...buckets.values()]
      .sort((a, b) => b.n - a.n)
      .slice(0, 6)
      .map((x) => toHex(x.r / x.n, x.g / x.n, x.b / x.n));
    return {
      palette,
      warmth: warm / pixels,
      brightness: bright / pixels,
      saturation: saturation / pixels,
      orientation: canvas.width === canvas.height ? 'square' : canvas.width > canvas.height ? 'landscape' : 'portrait',
    };
  } catch {
    return null;
  }
}

export async function shrinkToDataUrl(file, size = 600) {
  if (!canUseCanvas() || !(file instanceof Blob)) return null;
  try {
    const { canvas } = await drawSmall(file, size);
    return canvas.toDataURL('image/jpeg', 0.82);
  } catch {
    return null;
  }
}

export function colourDistance(a, b) {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return Math.sqrt((r1 - r2) ** 2 * 0.3 + (g1 - g2) ** 2 * 0.59 + (b1 - b2) ** 2 * 0.11);
}
