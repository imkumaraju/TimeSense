import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { progressToColor } from '@/lib/timerColors';

type Props = {
  progress: number;
  size?: number;
  strokeWidth?: number;
};

/** Shrinking pie without Reanimated (safer in Expo Go). */
export function ShrinkingPie({ progress, size = 280, strokeWidth }: Props) {
  const radius = size / 2;
  const sw = strokeWidth ?? radius;
  const r = radius - sw / 2;
  const circumference = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));
  const color = progressToColor(p);

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <G transform={`rotate(-90 ${radius} ${radius})`}>
          <Circle
            cx={radius}
            cy={radius}
            r={r}
            stroke="rgba(0,0,0,0.06)"
            strokeWidth={sw}
            fill="none"
          />
          <Circle
            cx={radius}
            cy={radius}
            r={r}
            stroke={color}
            strokeWidth={sw}
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={circumference * (1 - p)}
            strokeLinecap="butt"
          />
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
});
