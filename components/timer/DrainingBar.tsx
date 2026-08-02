import { StyleSheet, View } from 'react-native';

import { progressToColor } from '@/lib/timerColors';

type Props = {
  progress: number;
  width?: number;
  height?: number;
};

/** Draining bar without Reanimated (safer in Expo Go). */
export function DrainingBar({ progress, width = 72, height = 280 }: Props) {
  const p = Math.max(0, Math.min(1, progress));
  const color = progressToColor(p);

  return (
    <View style={[styles.track, { width, height }]}>
      <View style={[styles.fill, { height: p * height, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  fill: {
    width: '100%',
    borderRadius: 16,
  },
});
