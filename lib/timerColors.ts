/**
 * Progress color: green → yellow → red as time runs low.
 * `progress` is remaining fraction (1 = full, 0 = empty).
 */
export function progressToColor(progress: number): string {
  const p = Math.max(0, Math.min(1, progress));
  if (p > 0.5) {
    // green → yellow (1 → 0.5)
    const t = (1 - p) / 0.5;
    return lerpHex('#2A9D8F', '#E9C46A', t);
  }
  // yellow → red (0.5 → 0)
  const t = (0.5 - p) / 0.5;
  return lerpHex('#E9C46A', '#E76F51', t);
}

function lerpHex(a: string, b: string, t: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const r = Math.round(ca.r + (cb.r - ca.r) * t);
  const g = Math.round(ca.g + (cb.g - ca.g) * t);
  const bl = Math.round(ca.b + (cb.b - ca.b) * t);
  return `#${toHex(r)}${toHex(g)}${toHex(bl)}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function toHex(n: number): string {
  return n.toString(16).padStart(2, '0');
}
