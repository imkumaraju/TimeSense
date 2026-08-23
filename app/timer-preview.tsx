import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { VisualTimer } from '@/components/timer/VisualTimer';
import type { VisualStyle } from '@/types/task';

const STYLES: VisualStyle[] = [
  'pizza',
  'pie',
  'plant',
  'moon',
  'monk',
  'cat',
  'bar',
  'ring',
];

// Presets span both sides of the video-scrub "min animated duration" floor (default 8s) so
// you can check the below-floor snap-to-start/finish behavior as well as normal playback.
const DURATION_PRESETS = [5, 15, 60, 300];

/**
 * Storybook-style playground for visual timer variants — drives a real elapsed-time clock
 * (not just a raw progress ramp) so video-scrub styles get accurate totalDurationSec,
 * pause/resume, "got distracted," and finish behavior to test against.
 * Open via /timer-preview — not part of the main tab flow.
 */
export default function TimerPreviewScreen() {
  const [style, setStyle] = useState<VisualStyle>('plant');
  const [durationSec, setDurationSec] = useState(60);
  const [startedAt, setStartedAt] = useState(Date.now());
  const [pausedAt, setPausedAt] = useState<number | null>(null);
  const [pausedAccumMs, setPausedAccumMs] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [distractSignal, setDistractSignal] = useState(0);
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 100);
    return () => clearInterval(id);
  }, []);

  const isPaused = pausedAt != null;
  const now = Date.now();
  const elapsedMs = isComplete
    ? durationSec * 1000
    : (isPaused ? pausedAt! : now) - startedAt - pausedAccumMs;
  const progress = isComplete
    ? 0
    : Math.max(0, Math.min(1, 1 - elapsedMs / (durationSec * 1000)));

  useEffect(() => {
    if (!isComplete && progress <= 0) setIsComplete(true);
  }, [progress, isComplete]);

  const reset = (nextDurationSec = durationSec) => {
    setDurationSec(nextDurationSec);
    setStartedAt(Date.now());
    setPausedAt(null);
    setPausedAccumMs(0);
    setIsComplete(false);
  };

  const togglePause = () => {
    if (isPaused) {
      setPausedAccumMs((acc) => acc + (Date.now() - pausedAt!));
      setPausedAt(null);
    } else {
      setPausedAt(Date.now());
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Timer preview</Text>
      <View style={styles.stage}>
        <VisualTimer
          progress={progress}
          style={style}
          size={300}
          isPaused={isPaused}
          isComplete={isComplete}
          distractSignal={distractSignal}
          totalDurationSec={durationSec}
        />
      </View>

      <View style={styles.row}>
        {STYLES.map((s) => (
          <Pressable
            key={s}
            onPress={() => setStyle(s)}
            style={[styles.chip, style === s && styles.chipActive]}>
            <Text style={[styles.chipText, style === s && styles.chipTextActive]}>{s}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.row}>
        {DURATION_PRESETS.map((d) => (
          <Pressable
            key={d}
            onPress={() => reset(d)}
            style={[styles.chip, durationSec === d && styles.chipActive]}>
            <Text style={[styles.chipText, durationSec === d && styles.chipTextActive]}>
              {d}s
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.row}>
        <Pressable style={styles.action} onPress={togglePause} disabled={isComplete}>
          <Text style={styles.actionText}>{isPaused ? 'Resume' : 'Pause'}</Text>
        </Pressable>
        <Pressable
          style={styles.action}
          onPress={() => setDistractSignal((n) => n + 1)}
          disabled={isComplete}>
          <Text style={styles.actionText}>Got distracted</Text>
        </Pressable>
        <Pressable style={styles.action} onPress={() => setIsComplete(true)}>
          <Text style={styles.actionText}>Finish now</Text>
        </Pressable>
      </View>

      <Pressable style={styles.reset} onPress={() => reset()}>
        <Text style={styles.resetText}>Reset to full</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F4EF',
    paddingTop: 56,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    color: '#1D3557',
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(29,53,87,0.08)',
  },
  chipActive: {
    backgroundColor: '#1D3557',
  },
  chipText: {
    textTransform: 'capitalize',
    color: '#1D3557',
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#fff',
  },
  action: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#2A9D8F',
  },
  actionText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  reset: {
    alignSelf: 'center',
    marginBottom: 40,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  resetText: {
    color: '#2A9D8F',
    fontWeight: '600',
  },
});
