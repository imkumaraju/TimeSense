import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';

import { colors } from '@/constants/theme';

type Props = {
  /** Remaining fraction 1 → 0 (same as other VisualTimer styles). */
  progress: number;
  /** Width of the scene panel (height is derived from 220×150). */
  size?: number;
};

type HeadState = {
  eyeState: 'open' | 'half' | 'closed';
  mouthOpen?: number;
};

type TorsoOpts = {
  len: number;
  frontY: number;
  rearY: number;
  backY: number;
  bellyY: number;
};

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function trapezoid(t: number, a: number, b: number, c: number, d: number) {
  if (t <= a || t >= d) return 0;
  if (t < b) return (t - a) / (b - a);
  if (t <= c) return 1;
  return 1 - (t - c) / (d - c);
}

const GX = 112;
const GY = 124;
const W = 220;
const H = 150;

function bodyPath(cx: number, cy: number, o: TorsoOpts) {
  const frontX = cx - o.len / 2;
  const rearX = cx + o.len / 2;
  const shoulderY = cy + o.frontY;
  const hipY = cy + o.rearY;
  const backY = cy + o.backY;
  const bellyY = cy + o.bellyY;
  return `M ${frontX} ${shoulderY}
    C ${frontX - 3} ${backY + 8}, ${cx - o.len * 0.18} ${backY}, ${cx} ${backY}
    C ${cx + o.len * 0.18} ${backY}, ${rearX + 5} ${backY + 10}, ${rearX} ${hipY}
    C ${rearX + 2} ${hipY + 10}, ${rearX - 8} ${bellyY + 4}, ${cx + 4} ${bellyY}
    C ${cx - 4} ${bellyY}, ${frontX + 6} ${shoulderY + 8}, ${frontX} ${shoulderY} Z`;
}

function Torso({ cx, cy, o }: { cx: number; cy: number; o: TorsoOpts }) {
  const backY = cy + o.backY;
  return (
    <G>
      <Path d={bodyPath(cx, cy, o)} fill={colors.crust} />
      {[-0.28, -0.05, 0.2].map((f) => {
        const sx = cx + f * o.len;
        return (
          <Path
            key={f}
            d={`M ${sx - 6} ${backY + 6} Q ${sx} ${backY + 2} ${sx + 6} ${backY + 6}`}
            fill="none"
            stroke={colors.crustDark}
            strokeWidth={1.5}
            opacity={0.4}
          />
        );
      })}
      <Ellipse
        cx={cx - o.len * 0.08}
        cy={cy + o.bellyY - 4}
        rx={o.len * 0.22}
        ry={6}
        fill={colors.cream}
        opacity={0.55}
      />
    </G>
  );
}

function Head({
  hx,
  hy,
  rot,
  state,
}: {
  hx: number;
  hy: number;
  rot: number;
  state: HeadState;
}) {
  const mo = state.mouthOpen ?? 0;
  return (
    <G transform={`translate(${hx} ${hy}) rotate(${rot})`}>
      <Path d="M -7.5 -9 L -10.5 -18 L -3 -12 Z" fill={colors.crust} />
      <Path
        d="M -7 -9.5 L -8.7 -15 L -4.3 -11.5 Z"
        fill={colors.crustDark}
        opacity={0.45}
      />
      <Path d="M 7.5 -9 L 10.5 -18 L 3 -12 Z" fill={colors.crust} />
      <Path
        d="M 7 -9.5 L 8.7 -15 L 4.3 -11.5 Z"
        fill={colors.crustDark}
        opacity={0.45}
      />
      <Path
        d="M -8.5 -5 C -10 -11 -5.5 -15 0 -15 C 5.5 -15 10 -11 8.5 -5 C 8.2 0.5 5.5 5.5 1.8 7.2 C 3.2 9 2.2 11.5 0 11.5 C -2.2 11.5 -3.2 9 -1.8 7.2 C -5.5 5.5 -8.2 0.5 -8.5 -5 Z"
        fill={colors.crust}
      />
      <Ellipse cx={0} cy={5} rx={5.6} ry={4} fill={colors.cream} opacity={0.9} />
      <Path d="M -1.5 1.6 L 1.5 1.6 L 0 3.8 Z" fill={colors.sauce} />
      <Path
        d={`M 0 3.8 Q ${-1 - mo * 1.4} ${5.4 + mo * 2} ${-1.8 - mo * 0.8} ${6 + mo * 2.4}`}
        fill="none"
        stroke={colors.crustDark}
        strokeWidth={0.7}
        strokeLinecap="round"
      />
      <Path
        d={`M 0 3.8 Q ${1 + mo * 1.4} ${5.4 + mo * 2} ${1.8 + mo * 0.8} ${6 + mo * 2.4}`}
        fill="none"
        stroke={colors.crustDark}
        strokeWidth={0.7}
        strokeLinecap="round"
      />
      {state.eyeState === 'open' ? (
        <>
          <Ellipse cx={-3.4} cy={-1.4} rx={1.2} ry={1.5} fill={colors.basil} />
          <Ellipse cx={3.4} cy={-1.4} rx={1.2} ry={1.5} fill={colors.basil} />
          <Circle cx={-3.4} cy={-1.4} r={0.45} fill={colors.board} />
          <Circle cx={3.4} cy={-1.4} r={0.45} fill={colors.board} />
        </>
      ) : state.eyeState === 'half' ? (
        <>
          <Path
            d="M -4.8 -1.4 Q -3.4 -0.4 -2 -1.4"
            fill="none"
            stroke={colors.basil}
            strokeWidth={1.1}
            strokeLinecap="round"
          />
          <Path
            d="M 2 -1.4 Q 3.4 -0.4 4.8 -1.4"
            fill="none"
            stroke={colors.basil}
            strokeWidth={1.1}
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <Line
            x1={-4.8}
            y1={-1.4}
            x2={-2}
            y2={-1.4}
            stroke={colors.board}
            strokeWidth={0.9}
            strokeLinecap="round"
          />
          <Line
            x1={2}
            y1={-1.4}
            x2={4.8}
            y2={-1.4}
            stroke={colors.board}
            strokeWidth={0.9}
            strokeLinecap="round"
          />
        </>
      )}
      {([-1, 1] as const).map((side) =>
        [0, 1, 2].map((i) => (
          <Line
            key={`${side}-${i}`}
            x1={side * 3.2}
            y1={3.6 + i * 1.1}
            x2={side * 10.5}
            y2={1.8 + i * 1.9}
            stroke={colors.crustDark}
            strokeWidth={0.4}
            opacity={0.5}
          />
        )),
      )}
    </G>
  );
}

function Leg({
  x,
  y,
  phase,
  len,
  groomed,
}: {
  x: number;
  y: number;
  phase: number;
  len: number;
  groomed: boolean;
}) {
  const kneeX = x + phase * 3.2;
  const kneeY = y + len * 0.55;
  const pawX = x + phase * 6.5;
  const pawY = y + len;
  return (
    <G>
      <Path
        d={`M ${x} ${y} Q ${kneeX} ${kneeY} ${pawX} ${pawY}`}
        fill="none"
        stroke={colors.crustDark}
        strokeWidth={2.6}
        strokeLinecap="round"
      />
      <Ellipse
        cx={pawX}
        cy={pawY + 1}
        rx={2.6}
        ry={1.5}
        fill={groomed ? colors.cream : colors.crust}
      />
    </G>
  );
}

function Tail({ path, thickness = 4 }: { path: string; thickness?: number }) {
  return (
    <G>
      <Path
        d={path}
        fill="none"
        stroke={colors.crust}
        strokeWidth={thickness}
        strokeLinecap="round"
      />
      <Path
        d={path}
        fill="none"
        stroke={colors.crustDark}
        strokeWidth={thickness * 0.28}
        strokeLinecap="round"
        opacity={0.35}
      />
    </G>
  );
}

function PoseWalk({ alpha, t, clock }: { alpha: number; t: number; clock: number }) {
  if (alpha <= 0.01) return null;
  const x = lerp(238, GX - 6, clamp01(t / 0.1));
  const y = GY - 9;
  const stride = Math.sin(clock * 7);
  const bob = Math.abs(stride) * 0.8;
  return (
    <G opacity={alpha}>
      <Leg x={x - 8} y={y + 3} phase={stride} len={11} groomed={false} />
      <Leg x={x + 8} y={y + 3} phase={-stride} len={11} groomed={false} />
      <Torso
        cx={x}
        cy={y}
        o={{
          len: 30,
          frontY: 2,
          rearY: 2,
          backY: -9 + Math.abs(stride) * 0.6,
          bellyY: 9,
        }}
      />
      <Tail
        path={`M ${x + 15} ${y - 1} Q ${x + 27 + stride * 2} ${y - 12} ${x + 21 + stride * 3} ${y - 24}`}
        thickness={3.6}
      />
      <Head
        hx={x - 16}
        hy={y - 8 - bob}
        rot={-4}
        state={{ eyeState: 'open', mouthOpen: 0 }}
      />
    </G>
  );
}

function PoseStretch({ alpha, clock }: { alpha: number; clock: number }) {
  if (alpha <= 0.01) return null;
  const x = GX - 6;
  const y = GY - 6;
  const yawn = 0.55 + Math.sin(clock * 2) * 0.25;
  return (
    <G opacity={alpha}>
      <Leg x={x - 16} y={y + 2} phase={1} len={13} groomed={false} />
      <Leg x={x - 8} y={y + 2} phase={1} len={13} groomed={false} />
      <Torso
        cx={x}
        cy={y}
        o={{ len: 36, frontY: 6, rearY: -2, backY: -20, bellyY: 8 }}
      />
      <Leg x={x + 16} y={y - 4} phase={-0.6} len={9} groomed={false} />
      <Leg x={x + 22} y={y - 4} phase={-0.6} len={9} groomed={false} />
      <Tail path={`M ${x + 18} ${y - 8} Q ${x + 30} ${y - 20} ${x + 22} ${y - 28}`} />
      <Head
        hx={x - 24}
        hy={y + 6}
        rot={16}
        state={{ eyeState: 'half', mouthOpen: Math.max(0, yawn) }}
      />
    </G>
  );
}

function PoseGroomPaw({ alpha, clock }: { alpha: number; clock: number }) {
  if (alpha <= 0.01) return null;
  const x = GX;
  const y = GY - 2;
  const lick = (Math.sin(clock * 5) + 1) / 2;
  const pawY = lerp(y - 2, y - 11, lick);
  const pawX = lerp(x - 9, x - 6, lick);
  return (
    <G opacity={alpha}>
      <Leg x={x - 2} y={y + 8} phase={0.1} len={8} groomed={false} />
      <Torso
        cx={x}
        cy={y}
        o={{ len: 32, frontY: 6, rearY: 6, backY: -10, bellyY: 8 }}
      />
      <Tail
        path={`M ${x + 16} ${y + 8} Q ${x + 28} ${y + 2} ${x + 22} ${y - 8}`}
        thickness={3.8}
      />
      <Path
        d={`M ${x - 8} ${y + 8} Q ${x - 11} ${y - 2} ${pawX} ${pawY}`}
        fill="none"
        stroke={colors.crustDark}
        strokeWidth={3}
        strokeLinecap="round"
      />
      <Ellipse
        cx={pawX}
        cy={pawY}
        rx={2.6}
        ry={1.7}
        fill={lick > 0.6 ? colors.cream : colors.crust}
      />
      <Head
        hx={x - 8}
        hy={y - 14}
        rot={lerp(0, -14, lick)}
        state={{ eyeState: 'closed', mouthOpen: 0.2 }}
      />
      {lick > 0.55 ? (
        <Ellipse
          cx={pawX + 1}
          cy={pawY + 1.6}
          rx={1}
          ry={0.7}
          fill={colors.sauce}
          opacity={0.8}
        />
      ) : null}
    </G>
  );
}

function PoseWipeFace({ alpha, clock }: { alpha: number; clock: number }) {
  if (alpha <= 0.01) return null;
  const x = GX;
  const y = GY - 2;
  const wipe = (Math.sin(clock * 4.2) + 1) / 2;
  const sweepAngle = lerp(-10, 40, wipe);
  const px = x - 8 + Math.cos((sweepAngle * Math.PI) / 180) * 10;
  const py = y - 12 - Math.sin((sweepAngle * Math.PI) / 180) * 7;
  return (
    <G opacity={alpha}>
      <Leg x={x - 2} y={y + 8} phase={0.1} len={8} groomed />
      <Torso
        cx={x}
        cy={y}
        o={{ len: 32, frontY: 6, rearY: 6, backY: -10, bellyY: 8 }}
      />
      <Tail
        path={`M ${x + 16} ${y + 8} Q ${x + 28} ${y + 2} ${x + 22} ${y - 8}`}
        thickness={3.8}
      />
      <Path
        d={`M ${x - 8} ${y + 8} Q ${x - 13} ${y - 4} ${px} ${py}`}
        fill="none"
        stroke={colors.crustDark}
        strokeWidth={3}
        strokeLinecap="round"
      />
      <Ellipse cx={px} cy={py} rx={2.6} ry={1.7} fill={colors.cream} />
      <Head
        hx={x - 8}
        hy={y - 14}
        rot={-6}
        state={{ eyeState: 'closed', mouthOpen: 0 }}
      />
    </G>
  );
}

function PoseGroomTail({ alpha, clock }: { alpha: number; clock: number }) {
  if (alpha <= 0.01) return null;
  const x = GX;
  const y = GY - 2;
  const nod = (Math.sin(clock * 4.5) + 1) / 2;
  const headX = lerp(x - 6, x - 11, nod);
  const headY = lerp(y - 14, y + 2, nod);
  return (
    <G opacity={alpha}>
      <Leg x={x - 8} y={y + 8} phase={0.1} len={8} groomed />
      <Leg x={x + 2} y={y + 8} phase={0.1} len={8} groomed />
      <Torso
        cx={x}
        cy={y}
        o={{ len: 32, frontY: 6, rearY: 6, backY: -10, bellyY: 8 }}
      />
      <Tail
        path={`M ${x + 14} ${y + 6} Q ${x + 2} ${y + 16} ${x - 10} ${y + 9}`}
        thickness={4.2}
      />
      <Head
        hx={headX}
        hy={headY}
        rot={lerp(-8, -34, nod)}
        state={{ eyeState: 'closed', mouthOpen: 0.15 }}
      />
    </G>
  );
}

function PoseGroomFlank({ alpha, clock }: { alpha: number; clock: number }) {
  if (alpha <= 0.01) return null;
  const x = GX;
  const y = GY - 2;
  const twist = (Math.sin(clock * 4) + 1) / 2;
  const headX = lerp(x + 4, x + 12, twist);
  const headY = lerp(y - 8, y + 2, twist);
  return (
    <G opacity={alpha}>
      <Leg x={x - 8} y={y + 8} phase={0.1} len={8} groomed />
      <Leg x={x + 2} y={y + 8} phase={0.1} len={8} groomed />
      <Torso
        cx={x}
        cy={y}
        o={{ len: 32, frontY: 6, rearY: 6, backY: -10, bellyY: 8 }}
      />
      <Tail
        path={`M ${x + 16} ${y + 8} Q ${x + 28} ${y + 2} ${x + 22} ${y - 8}`}
        thickness={3.8}
      />
      <Head
        hx={headX}
        hy={headY}
        rot={lerp(10, 46, twist)}
        state={{ eyeState: 'closed', mouthOpen: 0.15 }}
      />
    </G>
  );
}

function PoseLoaf({ alpha, t }: { alpha: number; t: number }) {
  if (alpha <= 0.01) return null;
  const x = GX;
  const y = GY;
  const settle = clamp01((t - 0.8) / 0.2);
  return (
    <G opacity={alpha}>
      <Torso
        cx={x}
        cy={y}
        o={{
          len: lerp(32, 44, settle),
          frontY: 6,
          rearY: 6,
          backY: lerp(-10, -22, settle),
          bellyY: lerp(8, 4, settle),
        }}
      />
      <Tail
        path={`M ${x + 18} ${y + 6} Q ${x + 2} ${y + 16} ${x - 16} ${y + 8}`}
        thickness={4.4}
      />
      <Head
        hx={x - 10}
        hy={y - 18 - settle * 4}
        rot={-8}
        state={{
          eyeState: settle > 0.7 ? 'half' : 'closed',
          mouthOpen: 0,
        }}
      />
    </G>
  );
}

type Phase = {
  a: number;
  b: number;
  c: number;
  d: number;
  render: (wt: number, t: number, clock: number) => ReactNode;
};

const PHASES: Phase[] = [
  {
    a: 0.0,
    b: 0.02,
    c: 0.08,
    d: 0.11,
    render: (wt, t, clock) => <PoseWalk key="walk" alpha={wt} t={t} clock={clock} />,
  },
  {
    a: 0.09,
    b: 0.12,
    c: 0.15,
    d: 0.18,
    render: (wt, _t, clock) => <PoseStretch key="stretch" alpha={wt} clock={clock} />,
  },
  {
    a: 0.16,
    b: 0.2,
    c: 0.32,
    d: 0.36,
    render: (wt, _t, clock) => <PoseGroomPaw key="paw" alpha={wt} clock={clock} />,
  },
  {
    a: 0.34,
    b: 0.38,
    c: 0.48,
    d: 0.52,
    render: (wt, _t, clock) => <PoseWipeFace key="wipe" alpha={wt} clock={clock} />,
  },
  {
    a: 0.5,
    b: 0.54,
    c: 0.65,
    d: 0.69,
    render: (wt, _t, clock) => <PoseGroomTail key="tail" alpha={wt} clock={clock} />,
  },
  {
    a: 0.67,
    b: 0.71,
    c: 0.8,
    d: 0.84,
    render: (wt, _t, clock) => <PoseGroomFlank key="flank" alpha={wt} clock={clock} />,
  },
  {
    a: 0.82,
    b: 0.87,
    c: 1.0,
    d: 1.0,
    render: (wt, t) => <PoseLoaf key="loaf" alpha={wt} t={t} />,
  },
];

/**
 * Cat Loaf timer skin: walk in → stretch → groom → tuck into a loaf.
 * Driven by remaining `progress` (elapsed = 1 - progress).
 * Grooming loops use a separate animation clock so they stay smooth.
 */
export function CatLoaf({ progress, size = 320 }: Props) {
  const t = clamp01(1 - progress);
  const width = size;
  const height = Math.round(size * (H / W));
  const [clock, setClock] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setClock((c) => c + 0.05);
    }, 50);
    return () => clearInterval(id);
  }, []);

  return (
    <View style={[styles.wrap, { width, height }]}>
      <Svg width={width} height={height} viewBox={`0 0 ${W} ${H}`}>
        <Rect x={0} y={0} width={W} height={H} fill={colors.board} />
        <Circle cx={172} cy={24} r={20} fill={colors.cheese} opacity={0.12} />
        <Ellipse cx={GX} cy={GY + 8} rx={56} ry={11} fill={colors.boardLight} />
        <Ellipse
          cx={GX}
          cy={GY + 5}
          rx={48}
          ry={8}
          fill={colors.crustDark}
          opacity={0.55}
        />
        {PHASES.map((p) => {
          const wt = trapezoid(t, p.a, p.b, p.c, p.d);
          return wt > 0.01 ? p.render(wt, t, clock) : null;
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
});
