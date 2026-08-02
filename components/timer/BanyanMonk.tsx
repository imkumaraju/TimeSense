import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';

import { colors } from '@/constants/theme';

type Props = {
  /** Remaining fraction 1 → 0 (same as other VisualTimer styles). */
  progress: number;
  /** Width of the scene panel (height is derived from 220×150). */
  size?: number;
};

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function easeOut(t: number) {
  return 1 - Math.pow(1 - t, 2);
}

const BASIL_DARK = '#365938';
const GROUND_Y = 126;
const TREE_X = 116;
const SEAT_X = 116;
const W = 220;
const H = 150;

const AERIAL_ROOTS: Array<[number, number, number, number]> = [
  [96, 40, 88, 118],
  [104, 46, 98, 122],
  [128, 44, 134, 120],
  [136, 50, 142, 118],
  [112, 55, 110, 124],
];

const CANOPY: Array<[number, number, number]> = [
  [TREE_X - 28, 52, 22],
  [TREE_X - 8, 36, 26],
  [TREE_X + 16, 44, 24],
  [TREE_X + 30, 58, 18],
  [TREE_X - 2, 58, 20],
  [TREE_X - 22, 66, 16],
  [TREE_X + 22, 68, 15],
];

/**
 * Banyan Monk timer skin: walk in → sit → halo brightens → eyes open.
 * Driven by remaining `progress` (elapsed = 1 - progress).
 */
export function BanyanMonk({ progress, size = 320 }: Props) {
  const t = clamp01(1 - progress);
  const width = size;
  const height = Math.round(size * (H / W));

  const [breathePhase, setBreathePhase] = useState(0);
  const seated = t >= 0.08;

  useEffect(() => {
    if (!seated) return;
    const id = setInterval(() => {
      setBreathePhase((p) => p + 0.05);
    }, 50);
    return () => clearInterval(id);
  }, [seated]);

  const walkT = clamp01(t / 0.08);
  const eyesOpen = t >= 0.95;
  const headY = GROUND_Y - 46;

  const haloR = seated
    ? lerp(0, 34, easeOut(clamp01((t - 0.1) / 0.85)))
    : 0;
  const haloOpacity = eyesOpen
    ? 0.5
    : lerp(0.05, 0.45, easeOut(clamp01((t - 0.1) / 0.85)));
  const moteCount = seated
    ? Math.floor(lerp(0, 5, clamp01((t - 0.15) / 0.8)))
    : 0;
  const breathe = 1 + 0.02 * Math.sin(breathePhase * 2.4);

  let walkX = SEAT_X;
  let legSwing = 0;
  if (!seated) {
    walkX = lerp(20, SEAT_X, easeOut(walkT));
    legSwing = Math.sin(walkT * 18) * 4;
  }

  return (
    <View style={[styles.wrap, { width, height }]}>
      <Svg width={width} height={height} viewBox={`0 0 ${W} ${H}`}>
        <Rect x={0} y={0} width={W} height={H} fill={colors.board} />
        <Circle cx={110} cy={70} r={70} fill={colors.crust} opacity={0.035} />

        {/* Aerial roots */}
        {AERIAL_ROOTS.map(([x1, y1, x2, y2], i) => (
          <Path
            key={`root-${i}`}
            d={`M ${x1} ${y1} Q ${(x1 + x2) / 2 + 4} ${(y1 + y2) / 2} ${x2} ${y2}`}
            fill="none"
            stroke={colors.crustDark}
            strokeWidth={2}
            opacity={0.75}
          />
        ))}

        {/* Trunk */}
        <Rect
          x={TREE_X - 7}
          y={64}
          width={14}
          height={GROUND_Y - 64}
          fill={colors.crustDark}
          rx={3}
        />

        {/* Canopy */}
        {CANOPY.map(([cx, cy, r], i) => (
          <Circle
            key={`canopy-${i}`}
            cx={cx}
            cy={cy}
            r={r}
            fill={i % 2 === 0 ? colors.basil : BASIL_DARK}
            opacity={0.95}
          />
        ))}

        {/* Ground */}
        <Rect
          x={0}
          y={GROUND_Y}
          width={W}
          height={H - GROUND_Y}
          fill={colors.boardLight}
        />
        <Line
          x1={0}
          y1={GROUND_Y}
          x2={W}
          y2={GROUND_Y}
          stroke={colors.crustDark}
          strokeWidth={1}
          opacity={0.5}
        />

        {!seated ? (
          <G>
            <Line
              x1={walkX - 3}
              y1={GROUND_Y}
              x2={walkX - 3 + legSwing}
              y2={GROUND_Y - 16}
              stroke={colors.crust}
              strokeWidth={3}
              strokeLinecap="round"
            />
            <Line
              x1={walkX + 3}
              y1={GROUND_Y}
              x2={walkX + 3 - legSwing}
              y2={GROUND_Y - 16}
              stroke={colors.crust}
              strokeWidth={3}
              strokeLinecap="round"
            />
            <Rect
              x={walkX - 8}
              y={GROUND_Y - 42}
              width={16}
              height={28}
              rx={6}
              fill={colors.sauce}
            />
            <Circle cx={walkX} cy={GROUND_Y - 50} r={7} fill={colors.cream} />
          </G>
        ) : (
          <G>
            {haloR > 1 ? (
              <>
                <Circle
                  cx={SEAT_X}
                  cy={headY - 2}
                  r={haloR}
                  fill={colors.cheese}
                  opacity={haloOpacity * 0.35}
                />
                <Circle
                  cx={SEAT_X}
                  cy={headY - 2}
                  r={haloR * 0.66}
                  fill={colors.cheese}
                  opacity={haloOpacity * 0.55}
                />
                <Circle
                  cx={SEAT_X}
                  cy={headY - 2}
                  r={haloR * 0.36}
                  fill={colors.cheese}
                  opacity={haloOpacity * 0.75}
                />
              </>
            ) : null}

            {Array.from({ length: moteCount }, (_, i) => {
              const mx = SEAT_X + (i - 2) * 7;
              const cycle = (t * 90 + i * 11 + breathePhase) % 40;
              const my = headY - 20 - cycle;
              const op = clamp01(1 - cycle / 40) * 0.6;
              return (
                <Circle
                  key={`mote-${i}`}
                  cx={mx}
                  cy={my}
                  r={1.4}
                  fill={colors.cheese}
                  opacity={op}
                />
              );
            })}

            {/* Robe — seated silhouette with breath scale */}
            <G
              transform={`translate(${SEAT_X} ${GROUND_Y}) scale(1 ${breathe})`}>
              <Path
                d="M -26 0 Q -30 -8 -18 -10 L -8 -6 L 8 -6 L 18 -10 Q 30 -8 26 0 Z"
                fill={colors.sauce}
              />
              <Path d="M -16 -8 Q 0 -44 16 -8 Z" fill={colors.crust} />
            </G>

            <Circle cx={SEAT_X} cy={headY} r={9} fill={colors.cream} />

            {eyesOpen ? (
              <>
                <Circle
                  cx={SEAT_X - 3.2}
                  cy={headY - 1}
                  r={1}
                  fill={colors.board}
                />
                <Circle
                  cx={SEAT_X + 3.2}
                  cy={headY - 1}
                  r={1}
                  fill={colors.board}
                />
                <Path
                  d={`M ${SEAT_X - 3} ${headY + 3} Q ${SEAT_X} ${headY + 5} ${SEAT_X + 3} ${headY + 3}`}
                  fill="none"
                  stroke={colors.board}
                  strokeWidth={0.8}
                  strokeLinecap="round"
                />
              </>
            ) : (
              <>
                <Line
                  x1={SEAT_X - 4.5}
                  y1={headY - 1}
                  x2={SEAT_X - 1.5}
                  y2={headY - 1}
                  stroke={colors.board}
                  strokeWidth={1}
                  strokeLinecap="round"
                />
                <Line
                  x1={SEAT_X + 1.5}
                  y1={headY - 1}
                  x2={SEAT_X + 4.5}
                  y2={headY - 1}
                  stroke={colors.board}
                  strokeWidth={1}
                  strokeLinecap="round"
                />
              </>
            )}
          </G>
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
});
