/**
 * SVG path for the *remaining* pizza wedge.
 * Eaten portion grows clockwise from 12 o'clock so that
 * progress 1 = full pizza, progress 0 = empty plate.
 */
export function remainingPizzaPath(
  cx: number,
  cy: number,
  radius: number,
  progress: number,
): string {
  const p = Math.max(0, Math.min(1, progress));
  if (p <= 0) {
    return '';
  }
  if (p >= 0.999) {
    return [
      `M ${cx} ${cy - radius}`,
      `A ${radius} ${radius} 0 1 1 ${cx} ${cy + radius}`,
      `A ${radius} ${radius} 0 1 1 ${cx} ${cy - radius}`,
      'Z',
    ].join(' ');
  }

  const sweep = p * Math.PI * 2;
  const eaten = (1 - p) * Math.PI * 2;
  const start = -Math.PI / 2 + eaten;
  const end = start + sweep;
  const x1 = cx + radius * Math.cos(start);
  const y1 = cy + radius * Math.sin(start);
  const x2 = cx + radius * Math.cos(end);
  const y2 = cy + radius * Math.sin(end);
  const largeArc = sweep > Math.PI ? 1 : 0;

  return [
    `M ${cx} ${cy}`,
    `L ${x1} ${y1}`,
    `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
    'Z',
  ].join(' ');
}

/** Outer crust arc only (for stroke), matching remainingPizzaPath. */
export function remainingCrustArc(
  cx: number,
  cy: number,
  radius: number,
  progress: number,
): string {
  const p = Math.max(0, Math.min(1, progress));
  if (p <= 0) return '';
  if (p >= 0.999) {
    return [
      `M ${cx} ${cy - radius}`,
      `A ${radius} ${radius} 0 1 1 ${cx} ${cy + radius}`,
      `A ${radius} ${radius} 0 1 1 ${cx} ${cy - radius}`,
    ].join(' ');
  }

  const sweep = p * Math.PI * 2;
  const eaten = (1 - p) * Math.PI * 2;
  const start = -Math.PI / 2 + eaten;
  const end = start + sweep;
  const x1 = cx + radius * Math.cos(start);
  const y1 = cy + radius * Math.sin(start);
  const x2 = cx + radius * Math.cos(end);
  const y2 = cy + radius * Math.sin(end);
  const largeArc = sweep > Math.PI ? 1 : 0;

  return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
}

/**
 * Clockwise angle from 12 o'clock in [0, 2π).
 * Remaining pizza occupies [eatenAngle, 2π).
 */
export function clockwiseFrom12(x: number, y: number, cx: number, cy: number): number {
  const a = Math.atan2(y - cy, x - cx);
  return (a + Math.PI / 2 + Math.PI * 2) % (Math.PI * 2);
}

/** True if a point still sits on uneaten pizza. */
export function isInRemainingPizza(
  x: number,
  y: number,
  cx: number,
  cy: number,
  progress: number,
): boolean {
  const p = Math.max(0, Math.min(1, progress));
  if (p <= 0) return false;
  if (p >= 0.999) return true;
  const eaten = (1 - p) * Math.PI * 2;
  return clockwiseFrom12(x, y, cx, cy) >= eaten - 1e-6;
}

/** Plain-language status for the pizza timer (matches pizza UX stages). */
export function pizzaStatusLabel(progress: number): string {
  if (progress <= 0) return 'All gone';
  if (progress < 0.08) return 'Almost done';
  if (progress <= 0.5) return 'Half-time';
  if (progress < 0.95) return 'Estimated remaining';
  return 'Total time';
}
