import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import {
  isInRemainingPizza,
  remainingCrustArc,
  remainingPizzaPath,
} from '@/lib/pizzaClip';

type Props = {
  /** Remaining fraction 1 → 0. At 0 the pizza is fully eaten. */
  progress: number;
  size?: number;
  /** Draw cut lines (Slices style). */
  showSliceLines?: boolean;
  /** Number of pizza slices when showSliceLines is on. */
  sliceCount?: number;
};

const PEPPERONI: Array<{ x: number; y: number; r: number }> = [
  { x: 0.32, y: 0.3, r: 0.055 },
  { x: 0.55, y: 0.28, r: 0.05 },
  { x: 0.7, y: 0.4, r: 0.06 },
  { x: 0.38, y: 0.48, r: 0.052 },
  { x: 0.58, y: 0.52, r: 0.048 },
  { x: 0.45, y: 0.68, r: 0.055 },
  { x: 0.68, y: 0.62, r: 0.05 },
  { x: 0.28, y: 0.6, r: 0.045 },
  { x: 0.5, y: 0.4, r: 0.042 },
  { x: 0.62, y: 0.35, r: 0.04 },
];

/**
 * Pizza on a wooden board. Remaining area is drawn as a wedge Path
 * (no SVG ClipPath — unreliable on Android / Expo Go).
 */
export function EatingPizza({
  progress,
  size = 320,
  showSliceLines = false,
  sliceCount = 8,
}: Props) {
  const p = Math.max(0, Math.min(1, progress));
  const cx = size / 2;
  const cy = size / 2;
  const boardR = size * 0.48;
  const crustR = boardR * 0.96;
  const cheeseR = boardR * 0.86;
  const sauceR = boardR * 0.82;

  const crustFill = remainingPizzaPath(cx, cy, crustR, p);
  const cheeseFill = remainingPizzaPath(cx, cy, cheeseR, p);
  const sauceFill = remainingPizzaPath(cx, cy, sauceR, p);
  const crustArc = remainingCrustArc(cx, cy, crustR, p);
  const showPizza = p > 0.002 && crustFill.length > 0;

  const toppings = showPizza
    ? PEPPERONI.filter((dot) =>
        isInRemainingPizza(dot.x * size, dot.y * size, cx, cy, p),
      )
    : [];

  const sliceLines =
    showSliceLines && showPizza
      ? Array.from({ length: sliceCount }, (_, i) => {
          const ang = -Math.PI / 2 + (i / sliceCount) * Math.PI * 2;
          const tipX = cx + Math.cos(ang) * cheeseR * 0.15;
          const tipY = cy + Math.sin(ang) * cheeseR * 0.15;
          const endX = cx + Math.cos(ang) * cheeseR;
          const endY = cy + Math.sin(ang) * cheeseR;
          const midX = cx + Math.cos(ang) * cheeseR * 0.6;
          const midY = cy + Math.sin(ang) * cheeseR * 0.6;
          if (!isInRemainingPizza(midX, midY, cx, cy, p)) return null;
          return { tipX, tipY, endX, endY, key: i };
        }).filter(Boolean)
      : [];

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={boardR} fill="#B8956A" />
        <Circle cx={cx} cy={cy} r={boardR * 0.94} fill="#C9A87A" />
        <Circle cx={cx} cy={cy} r={boardR * 0.88} fill="#D4B896" />
        <Circle
          cx={cx}
          cy={cy}
          r={boardR * 0.72}
          fill="none"
          stroke="#A8895C"
          strokeWidth={1.5}
          opacity={0.35}
        />
        <Circle
          cx={cx}
          cy={cy}
          r={boardR * 0.5}
          fill="none"
          stroke="#A8895C"
          strokeWidth={1}
          opacity={0.25}
        />

        {showPizza ? (
          <>
            <Path d={crustFill} fill="#C47A3A" />
            <Path d={sauceFill} fill="#D94A3A" />
            <Path d={cheeseFill} fill="#F0C84A" />
            {crustArc ? (
              <Path
                d={crustArc}
                fill="none"
                stroke="#A65F2A"
                strokeWidth={boardR * 0.08}
                strokeLinecap="butt"
              />
            ) : null}
            {toppings.map((dot, i) => (
              <Circle
                key={i}
                cx={dot.x * size}
                cy={dot.y * size}
                r={dot.r * size}
                fill="#B83A2E"
              />
            ))}
            {toppings.map((dot, i) => (
              <Circle
                key={`h-${i}`}
                cx={dot.x * size - dot.r * size * 0.2}
                cy={dot.y * size - dot.r * size * 0.2}
                r={dot.r * size * 0.25}
                fill="#D45A4A"
                opacity={0.7}
              />
            ))}
            {sliceLines.map((line) =>
              line ? (
                <Line
                  key={line.key}
                  x1={line.tipX}
                  y1={line.tipY}
                  x2={line.endX}
                  y2={line.endY}
                  stroke="rgba(166,95,42,0.55)"
                  strokeWidth={2}
                />
              ) : null,
            )}
          </>
        ) : null}

        <Circle
          cx={cx}
          cy={cy}
          r={boardR}
          fill="none"
          stroke="rgba(0,0,0,0.1)"
          strokeWidth={2}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
});
