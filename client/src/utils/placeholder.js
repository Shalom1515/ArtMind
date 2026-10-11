const FALLBACK = ['#D9D0C1', '#EAE2D3', '#C8B59A'];

export function placeholderBackground(tones) {
  const colours = Array.isArray(tones) && tones.length ? tones : FALLBACK;
  if (colours.length === 1) return colours[0];
  const stops = colours.map((c, i) => `${c} ${Math.round((i / (colours.length - 1)) * 100)}%`).join(', ');
  return `linear-gradient(135deg, ${stops})`;
}
