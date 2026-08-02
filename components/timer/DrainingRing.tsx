import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { progressToColor } from '@/lib/timerColors';

type Props = {
  progress: number;
  size?: number;
  strokeWidth?: number;
};

/** Draining ring without Reanimated (safer in Expo Go). */
export function DrainingRing({ progress, size = 280, strokeWidth = 18 }: Props) {
  const radius = size / 2;
  const r = radius - strokeWidth / 2;
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
            stroke="rgba(0,0,0,0.08)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={radius}
            cy={radius}
            r={r}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={circumference * (1 - p)}
            strokeLinecap="round"
          />
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
});
