import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { formatClock } from '@/lib/timerMath';

type Props = {
  /** Remaining fraction 1 → 0 (same as VisualTimer). */
  progress: number;
  elapsedSeconds: number;
};

const MILESTONES = [0, 0.25, 0.5, 0.75, 1];

function SliceIcon({ filled, size = 22 }: { filled: boolean; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.42;
  // Small wedge looking like a pizza slice tip-up
  const d = [
    `M ${cx} ${cy}`,
    `L ${cx - r * 0.75} ${cy + r * 0.55}`,
    `A ${r} ${r} 0 0 1 ${cx + r * 0.75} ${cy + r * 0.55}`,
    'Z',
  ].join(' ');

  return (
    <Svg width={size} height={size}>
      <Path d={d} fill={filled ? '#3DDC97' : 'none'} stroke={filled ? '#2BB87A' : '#C5CCD6'} strokeWidth={1.5} />
      {filled ? (
        <Circle cx={cx} cy={cy + r * 0.15} r={size * 0.08} fill="#D94A3A" />
      ) : null}
    </Svg>
  );
}

/** Horizontal “TIME SPENT” bar + pizza-slice milestones (mockup). */
export function TimeSpentTrack({ progress, elapsedSeconds }: Props) {
  const spent = Math.max(0, Math.min(1, 1 - progress));
  const pct = Math.round(spent * 100);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Time spent</Text>

      <View style={styles.barBlock}>
        {spent > 0.02 ? (
          <View style={[styles.bubble, { left: `${Math.min(92, Math.max(8, pct))}%` }]}>
            <Text style={styles.bubbleText}>
              {pct}% · {formatClock(elapsedSeconds)}
            </Text>
          </View>
        ) : null}

        <View style={styles.track}>
          <View style={[styles.fill, { width: `${spent * 100}%` }]} />
        </View>
      </View>

      <View style={styles.milestones}>
        <View style={styles.milestoneLine} />
        {MILESTONES.map((m) => (
          <View key={m} style={[styles.milestone, { left: `${m * 100}%` }]}>
            <SliceIcon filled={spent >= m - 0.001} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    paddingHorizontal: 8,
    marginTop: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: 'rgba(29,53,87,0.45)',
    marginBottom: 18,
  },
  barBlock: {
    position: 'relative',
    marginBottom: 14,
  },
  bubble: {
    position: 'absolute',
    bottom: 14,
    transform: [{ translateX: -36 }],
    backgroundColor: '#1D3557',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    minWidth: 72,
    alignItems: 'center',
  },
  bubbleText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(29,53,87,0.1)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#3DDC97',
  },
  milestones: {
    height: 28,
    position: 'relative',
    marginTop: 4,
  },
  milestoneLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 11,
    height: 2,
    backgroundColor: '#3DDC97',
    opacity: 0.55,
  },
  milestone: {
    position: 'absolute',
    top: 0,
    marginLeft: -11,
  },
});
