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

/**
 * Storybook-style playground for visual timer variants.
 * Open via /timer-preview — not part of the main tab flow.
 */
export default function TimerPreviewScreen() {
  const [style, setStyle] = useState<VisualStyle>('pizza');
  const [progress, setProgress] = useState(1);

  useEffect(() => {
    const id = setInterval(() => {
      setProgress((p) => {
        const next = p - 0.01;
        return next <= 0 ? 1 : next;
      });
    }, 80);
    return () => clearInterval(id);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Timer preview</Text>
      <View style={styles.stage}>
        <VisualTimer progress={progress} style={style} size={300} />
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
      <Pressable style={styles.reset} onPress={() => setProgress(1)}>
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
