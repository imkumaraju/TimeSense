import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';

import { colors } from '@/constants/theme';

type Props = {
  /** Remaining fraction 1 → 0 (same as other VisualTimer styles). */
  progress: number;
  /** Width of the sky panel (height is derived). */
  size?: number;
};

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

const STARS: Array<{ x: number; y: number; r: number; tw: number }> = (() => {
  const out: Array<{ x: number; y: number; r: number; tw: number }> = [];
  let seed = 42;
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  for (let i = 0; i < 48; i++) {
    out.push({
      x: rnd() * 220,
      y: rnd() * 100,
      r: 0.55 + rnd() * 1.15,
      tw: rnd(),
    });
  }
  return out;
})();

/**
 * Moon time-lapse: travels horizon→zenith→horizon while cycling phases
 * (new → waxing → full at mid → waning → new). Compact sky panel.
 */
export function MoonArc({ progress, size = 320 }: Props) {
  const rawId = useId().replace(/:/g, '');
  const glowId = `horizon-${rawId}`;

  const t = clamp01(1 - progress);
  const W = 220;
  const H = 150;
  const width = size;
  const height = Math.round(size * (H / W));

  const horizonY = 118;
  const arcCx = 110;
  const arcCy = horizonY;
  const arcR = 88;
  const moonR = 11;

  // Position along sky arc (180° left → 0° right)
  const angle = lerp(180, 0, t);
  const rad = (angle * Math.PI) / 180;
  const mx = arcCx + arcR * Math.cos(rad);
  const my = arcCy - arcR * Math.sin(rad);

  // Phase: new at rise/set, full at zenith
  const waxing = t <= 0.5;
  const lit = waxing ? t * 2 : (1 - t) * 2;
  const shadowOffset = lit * 2 * moonR;
  const shadowCx = waxing ? mx - shadowOffset : mx + shadowOffset;

  const glow = Math.pow(Math.abs(t - 0.5) * 2, 1.6);
  const startX = arcCx + arcR * Math.cos(Math.PI);
  const startY = arcCy - arcR * Math.sin(Math.PI);
  const arcPath = `M ${arcCx - arcR} ${arcCy} A ${arcR} ${arcR} 0 0 1 ${arcCx + arcR} ${arcCy}`;
  const traveled =
    t > 0.01
      ? `M ${startX} ${startY} A ${arcR} ${arcR} 0 0 1 ${mx} ${my}`
      : '';

  return (
    <View style={[styles.wrap, { width, height }]}>
      <Svg width={width} height={height} viewBox={`0 0 ${W} ${H}`}>
        <Defs>
          <LinearGradient id={glowId} x1="0" y1="1" x2="0" y2="0">
            <Stop
              offset="0%"
              stopColor={colors.sauce}
              stopOpacity={0.5 * glow}
            />
            <Stop
              offset="55%"
              stopColor={colors.crust}
              stopOpacity={0.2 * glow}
            />
            <Stop offset="100%" stopColor={colors.board} stopOpacity={0} />
          </LinearGradient>
        </Defs>

        <Rect x={0} y={0} width={W} height={H} fill={colors.board} />
        <Rect x={0} y={0} width={W} height={H} fill={`url(#${glowId})`} />

        {STARS.map((s, i) => {
          const nearHorizonFade = 1 - glow * 0.65;
          const twinkle = 0.5 + 0.5 * Math.sin(t * 30 + s.tw * 20);
          return (
            <Circle
              key={i}
              cx={s.x}
              cy={s.y}
              r={s.r}
              fill={colors.cream}
              opacity={(0.3 + 0.5 * twinkle) * nearHorizonFade}
            />
          );
        })}

        <Rect
          x={0}
          y={horizonY}
          width={W}
          height={H - horizonY}
          fill={colors.boardLight}
        />
        <Line
          x1={0}
          y1={horizonY}
          x2={W}
          y2={horizonY}
          stroke={colors.crustDark}
          strokeWidth={1}
          opacity={0.5}
        />

        <Path
          d={arcPath}
          fill="none"
          stroke={colors.cream}
          strokeWidth={1}
          strokeDasharray="2 5"
          opacity={0.2}
        />
        {traveled ? (
          <Path
            d={traveled}
            fill="none"
            stroke={colors.cheese}
            strokeWidth={1.2}
            opacity={0.45}
          />
        ) : null}

        {/* Moon glow */}
        <Circle cx={mx} cy={my} r={moonR + 5} fill={colors.crust} opacity={0.2} />

        {/* Lit disk + shadow carve for phase */}
        <Circle cx={mx} cy={my} r={moonR} fill={colors.cream} />
        <Circle cx={shadowCx} cy={my} r={moonR} fill={colors.board} />

        <Circle
          cx={mx - 3}
          cy={my - 2}
          r={1.1}
          fill={colors.cheese}
          opacity={0.45 * lit}
        />
        <Circle
          cx={mx}
          cy={my + 2.5}
          r={0.8}
          fill={colors.cheese}
          opacity={0.35 * lit}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'center',
    borderRadius: 14,
    overflow: 'hidden',
  },
});
