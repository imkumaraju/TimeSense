import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';

import { colors } from '@/constants/theme';

type Props = {
  /** Remaining fraction 1 → 0 (same as other VisualTimer styles). */
  progress: number;
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

function lerpColor(a: string, b: string, t: number): string {
  const parse = (hex: string) => {
    const h = hex.replace('#', '');
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ];
  };
  const ah = parse(a);
  const bh = parse(b);
  const c = ah.map((v, i) => Math.round(v + (bh[i]! - v) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

const BASIL = colors.basil;
const BASIL_DRY = '#A98B4E';
const WILT = '#8A6A4A';
const SOIL = '#4A2E17';

/**
 * Plant timer skin: seed → grow → bloom → wilt as elapsed fraction goes 0→1.
 * Driven by remaining `progress` (elapsed = 1 - progress).
 */
export function GrowingPlant({ progress, size = 220 }: Props) {
  const t = clamp01(1 - progress); // elapsed fraction
  const w = size;
  const h = size * 1.15;

  const baseX = 100;
  const baseY = 208;
  const maxStem = 118;

  const growT = clamp01(t / 0.5);
  const stemH = easeOut(growT) * maxStem;
  const wiltT = clamp01((t - 0.85) / 0.15);
  const droopAngle = lerp(0, 34, wiltT);
  const stemColor = lerpColor(BASIL, BASIL_DRY, wiltT);
  const potFill = t < 0.06 ? colors.boardLight : colors.crust;

  const tipX =
    baseX + Math.sin((droopAngle * Math.PI) / 180) * stemH * 0.5;
  const tipY =
    baseY -
    14 -
    stemH +
    (1 - Math.cos((droopAngle * Math.PI) / 180)) * stemH * 0.3;

  const bloomT = clamp01((t - 0.45) / 0.3);
  const petalScale = 0.15 + 0.85 * easeOut(bloomT);
  const petalColor = lerpColor(colors.crust, WILT, wiltT);
  const centerColor = lerpColor(colors.sauce, '#5C2E1C', wiltT);
  const droopExtra = wiltT * 50;

  const leafPairs = [0.35, 0.65];

  return (
    <View style={[styles.wrap, { width: w, height: h }]}>
      <Svg width={w} height={h} viewBox="0 0 200 230">
        {/* pot shadow + pot + soil */}
        <Ellipse
          cx={baseX}
          cy={baseY + 10}
          rx={34}
          ry={9}
          fill={colors.boardLight}
        />
        <Path
          d={`M ${baseX - 30} ${baseY} Q ${baseX} ${baseY + 22} ${baseX + 30} ${baseY} L ${baseX + 26} ${baseY - 14} Q ${baseX} ${baseY - 6} ${baseX - 26} ${baseY - 14} Z`}
          fill={potFill}
        />
        <Ellipse cx={baseX} cy={baseY - 14} rx={26} ry={6} fill={SOIL} />

        {t < 0.06 ? (
          <Circle cx={baseX} cy={baseY - 16} r={3} fill="#6B4A2E" />
        ) : (
          <>
            <Path
              d={`M ${baseX} ${baseY - 14} Q ${baseX + (tipX - baseX) * 0.5} ${(baseY - 14 + tipY) / 2} ${tipX} ${tipY}`}
              fill="none"
              stroke={stemColor}
              strokeWidth={5}
              strokeLinecap="round"
            />

            {leafPairs.map((frac, i) => {
              const attachStemLen = stemH * frac;
              if (attachStemLen < 6) return null;
              const along = attachStemLen / Math.max(stemH, 1);
              const ax = lerp(baseX, tipX, along);
              const ay = lerp(baseY - 14, tipY, along);
              const leafScale = clamp01((growT - frac * 0.5) / 0.15 + 0.2);
              const side = i % 2 === 0 ? -1 : 1;
              const leafColor = lerpColor(BASIL, BASIL_DRY, wiltT);
              const rot = side * (40 + droopAngle * 0.6);
              const sc = 0.3 + 0.7 * leafScale;
              return (
                <G
                  key={i}
                  transform={`translate(${ax} ${ay}) rotate(${rot}) scale(${sc})`}>
                  <Path d="M0 0 Q 16 -6 26 0 Q 16 6 0 0 Z" fill={leafColor} />
                </G>
              );
            })}

            {bloomT > 0 ? (
              <G transform={`translate(${tipX} ${tipY}) rotate(${droopExtra})`}>
                {Array.from({ length: 6 }, (_, i) => {
                  const angle = (360 / 6) * i;
                  return (
                    <Ellipse
                      key={i}
                      cx={0}
                      cy={-10 * petalScale}
                      rx={6 * petalScale}
                      ry={11 * petalScale}
                      fill={petalColor}
                      transform={`rotate(${angle})`}
                    />
                  );
                })}
                <Circle cx={0} cy={0} r={5 * petalScale} fill={centerColor} />
              </G>
            ) : null}
          </>
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
});
