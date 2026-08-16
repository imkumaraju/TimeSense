/**
 * Chibi Tabby mascot as real SVG markup — ported from chibi-tabby-widget-design.html's
 * drawChibiTabby()/drawDecoration(), so the Android widget renders the actual design instead
 * of a placeholder. Colors come from constants/theme.ts, not the prototype's own hex values
 * (per BUILD_SPEC.md §10.1). Static per mood — no blink; widgets refresh on a timeline, not a
 * live animation loop (§10.4).
 */
import { colors } from '@/constants/theme';
import type { WidgetMood } from '@/lib/widgetSnapshot';

const CT = {
  fur: colors.crust,
  furDark: colors.crustDark,
  cream: colors.cream,
  iris: colors.basil,
  nose: colors.sauce,
  ink: colors.ink,
};

type Bg = string | [string, string];

/** Mirrors chibi-tabby-widget-design.html's CHIBI_BG, with theme tokens in place of its hex values. */
const CHIBI_BG: Record<WidgetMood, Bg> = {
  calm: colors.crust,
  alert: [colors.crust, colors.crustDark],
  // Last Chance always uses the sauce-to-board gradient (BUILD_SPEC §10.1), regardless of mascot style.
  worried: [colors.sauce, colors.board],
  sad: colors.boardLight,
  // Completed always uses basil (BUILD_SPEC §10.1).
  completed: colors.basil,
  resting: colors.boardLight,
  freeze: [colors.crust, colors.cheese],
  happy: [colors.cheese, colors.crust],
};

function bgMarkup(mood: WidgetMood): string {
  const bg = CHIBI_BG[mood];
  if (typeof bg === 'string') {
    return `<rect width="200" height="200" fill="${bg}"/>`;
  }
  const [from, to] = bg;
  const id = `bg-${mood}`;
  // Approximates the prototype's `linear-gradient(160deg, from, to)`.
  return `
    <defs>
      <linearGradient id="${id}" x1="10%" y1="0%" x2="85%" y2="100%">
        <stop offset="0%" stop-color="${from}"/>
        <stop offset="100%" stop-color="${to}"/>
      </linearGradient>
    </defs>
    <rect width="200" height="200" fill="url(#${id})"/>
  `;
}

function mirrored(half: string): string {
  return `<g>${half}</g><g transform="translate(200,0) scale(-1,1)">${half}</g>`;
}

function earsMarkup(headCy: number, earLift: number): string {
  const eo = headCy - 104;
  const l = (n: number) => (-earLift + eo + n).toFixed(2);
  const half = `
    <path d="M 148 ${l(66)} C 158 ${l(40)} 150 ${l(22)} 138 ${l(20)} C 136 ${l(36)} 138 ${l(54)} 144 ${l(70)} Z" fill="${CT.fur}"/>
    <path d="M 145 ${l(58)} C 150 ${l(42)} 147 ${l(30)} 140 ${l(27)} C 140 ${l(38)} 141 ${l(50)} 144 ${l(60)} Z" fill="${CT.cream}" opacity="0.7"/>
    <path d="M 130 ${(90 + eo).toFixed(2)} Q 140 ${(94 + eo).toFixed(2)} 148 ${(100 + eo).toFixed(2)}" fill="none" stroke="${CT.furDark}" stroke-width="2.4" opacity="0.4" stroke-linecap="round"/>
  `;
  return mirrored(half);
}

function mouthMarkup(mood: WidgetMood, muzzleCy: number): string {
  const isDone = mood === 'completed';
  const my = muzzleCy - 2;
  if (mood === 'worried') {
    return `<ellipse cx="100" cy="${my + 6}" rx="6" ry="8" fill="${CT.ink}" opacity="0.85"/>`;
  }
  if (mood === 'sad') {
    return `<path d="M 90 ${my + 8} Q 100 ${my + 2} 110 ${my + 8}" fill="none" stroke="${CT.furDark}" stroke-width="2" stroke-linecap="round"/>`;
  }
  if (mood === 'happy') {
    return `<path d="M 86 ${my} Q 100 ${my + 16} 114 ${my}" fill="none" stroke="${CT.furDark}" stroke-width="2.4" stroke-linecap="round"/>`;
  }
  if (isDone) {
    return `<path d="M 96 ${my + 2} Q 100 ${my + 5} 104 ${my + 2}" fill="none" stroke="${CT.nose}" stroke-width="1" stroke-linecap="round"/>`;
  }
  return `
    <path d="M 100 ${my} Q 100 ${my + 4} 96 ${my + 4}" fill="none" stroke="${CT.ink}" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M 100 ${my} Q 100 ${my + 4} 104 ${my + 4}" fill="none" stroke="${CT.ink}" stroke-width="1.6" stroke-linecap="round"/>
  `;
}

function eyebrowsMarkup(mood: WidgetMood, headCy: number): string {
  if (mood !== 'worried') return '';
  return mirrored(
    `<path d="M 108 ${headCy - 24} L 126 ${headCy - 16}" stroke="${CT.ink}" stroke-width="3" stroke-linecap="round"/>`,
  );
}

function eyesMarkup(mood: WidgetMood, headCy: number): string {
  const eyeCy = headCy - 6;
  if (mood === 'resting') {
    return mirrored(
      `<path d="M 108 ${eyeCy} Q 120 ${eyeCy + 6} 132 ${eyeCy}" fill="none" stroke="${CT.ink}" stroke-width="2.2" stroke-linecap="round"/>`,
    );
  }
  const isDone = mood === 'completed';
  const ry = isDone ? 6 : mood === 'worried' ? 16 : 14;
  const half = `
    <ellipse cx="120" cy="${eyeCy}" rx="13" ry="${ry}" fill="${CT.ink}"/>
    <ellipse cx="120" cy="${eyeCy}" rx="9.5" ry="${(ry * 0.78).toFixed(2)}" fill="${CT.iris}"/>
    <circle cx="120" cy="${eyeCy - ry * 0.3}" r="5" fill="#1A130C"/>
    <circle cx="117" cy="${eyeCy - ry * 0.45}" r="2.2" fill="${CT.cream}"/>
  `;
  return mirrored(half);
}

function decorationsMarkup(mood: WidgetMood): string {
  if (mood === 'freeze') {
    const points: Array<[number, number]> = [
      [36, 36],
      [164, 32],
      [30, 74],
      [170, 78],
    ];
    return points
      .map(
        ([x, y]) =>
          `<path d="M ${x} ${y - 5} L ${x} ${y + 5} M ${x - 5} ${y} L ${x + 5} ${y}" stroke="${colors.cheese}" stroke-width="1.6" stroke-linecap="round" opacity="0.85"/>`,
      )
      .join('');
  }
  if (mood === 'happy') {
    const pieces: Array<[number, number, string]> = [
      [30, 30, colors.sauce],
      [170, 26, colors.basil],
      [24, 80, colors.crust],
      [176, 70, colors.sauce],
      [150, 20, colors.basil],
      [40, 50, colors.cream],
    ];
    return pieces
      .map(
        ([x, y, c]) =>
          `<rect x="${x - 3}" y="${y - 3}" width="6" height="6" fill="${c}" transform="rotate(${(x * y) % 45} ${x} ${y})" opacity="0.9"/>`,
      )
      .join('');
  }
  return '';
}

/** Full SVG markup for a mood tile, matching drawChibiTabby()'s geometry 1:1. */
export function chibiTabbySvg(mood: WidgetMood): string {
  const isDone = mood === 'completed';
  const headCy = isDone ? 112 : 104;
  const muzzleCy = headCy + 22;
  const earLift = mood === 'alert' || mood === 'happy' ? 6 : isDone || mood === 'resting' ? -6 : 0;

  return `
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      ${bgMarkup(mood)}
      <ellipse cx="100" cy="${isDone ? 178 : 172}" rx="${isDone ? 52 : 44}" ry="${isDone ? 26 : 22}" fill="${CT.fur}"/>
      <circle cx="100" cy="${headCy}" r="${isDone ? 58 : 64}" fill="${CT.fur}"/>
      ${earsMarkup(headCy, earLift)}
      <ellipse cx="100" cy="${muzzleCy}" rx="38" ry="26" fill="${CT.cream}" opacity="0.92"/>
      <path d="M 96 ${muzzleCy - 10} L 104 ${muzzleCy - 10} L 100 ${muzzleCy - 2} Z" fill="${CT.nose}"/>
      ${mouthMarkup(mood, muzzleCy)}
      ${eyebrowsMarkup(mood, headCy)}
      ${eyesMarkup(mood, headCy)}
      ${decorationsMarkup(mood)}
    </svg>
  `;
}
