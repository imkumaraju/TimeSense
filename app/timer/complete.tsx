import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TsButton } from '@/components/ui/TsButton';
import { TsChip } from '@/components/ui/TsChip';
import { TsSectionLabel } from '@/components/ui/TsSectionLabel';
import { colors, fonts } from '@/constants/theme';
import { syncNow } from '@/lib/syncService';
import { recordStreakOnTaskComplete } from '@/lib/streakService';
import { completeTask } from '@/lib/tasksDb';
import { useActiveTimerStore } from '@/stores/activeTimerStore';
import { useAuthStore } from '@/stores/authStore';
import type { MoodTag } from '@/types/task';

const MOODS: Array<{ label: string; value: MoodTag }> = [
  { label: 'Too fast', value: 'too_fast' },
  { label: 'About right', value: 'about_right' },
  { label: 'Dragged on', value: 'dragged_on' },
];

export default function TaskCompleteScreen() {
  const insets = useSafeAreaInsets();
  const meta = useActiveTimerStore((s) => s.meta);
  const snapshot = useActiveTimerStore((s) => s.snapshot);
  const getDerived = useActiveTimerStore((s) => s.getDerived);
  const clear = useActiveTimerStore((s) => s.clear);
  const mode = useAuthStore((s) => s.mode);
  const user = useAuthStore((s) => s.user);

  const derived = getDerived(Date.now());
  const [mood, setMood] = useState<MoodTag>('about_right');
  const [saving, setSaving] = useState(false);

  const actualMinutes = useMemo(() => {
    if (!derived) return 0;
    return Math.max(1, Math.round(derived.elapsedSeconds / 60));
  }, [derived]);

  const predictedMins = snapshot
    ? Math.max(1, Math.round(snapshot.durationSeconds / 60))
    : actualMinutes;
  const delta = actualMinutes - predictedMins;

  if (!meta || !derived) {
    return <View style={styles.container} />;
  }

  const onSave = async () => {
    if (!meta.taskId || saving) return;
    setSaving(true);
    try {
      const elapsedSeconds = Math.max(1, derived.elapsedSeconds);
      await completeTask(meta.taskId, elapsedSeconds, Date.now(), mood);
      await recordStreakOnTaskComplete(user?.id ?? null);
      clear();
      if (mode === 'signed_in') {
        void syncNow();
      }
      router.replace('/');
    } finally {
      setSaving(false);
    }
  };

  const deltaLabel =
    delta === 0
      ? 'Right on your prediction'
      : delta > 0
        ? `${delta}m over your prediction`
        : `${Math.abs(delta)}m under your prediction`;

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 20 },
      ]}>
      <Text style={styles.done}>Done!</Text>
      <Text style={styles.title}>Nice work!</Text>
      <Text style={styles.sub}>How long did that actually take?</Text>

      <Text style={styles.actual}>
        {actualMinutes}
        <Text style={styles.actualUnit}> min</Text>
      </Text>
      <Text style={[styles.delta, delta > 0 && styles.deltaOver]}>{deltaLabel}</Text>

      <TsSectionLabel style={{ alignSelf: 'center', marginTop: 8 }}>
        How did it feel?
      </TsSectionLabel>
      <View style={styles.moods}>
        {MOODS.map((m) => (
          <TsChip
            key={m.value!}
            label={m.label}
            active={mood === m.value}
            onPress={() => setMood(m.value)}
          />
        ))}
      </View>

      <View style={{ flex: 1 }} />

      {saving ? (
        <ActivityIndicator color={colors.sauce} style={{ marginBottom: 12 }} />
      ) : null}
      <TsButton label="Save" block disabled={saving} onPress={() => void onSave()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.plate,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  done: {
    fontFamily: fonts.displayBlack,
    fontSize: 28,
    color: colors.basil,
    marginBottom: 6,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.ink,
  },
  sub: {
    marginTop: 8,
    marginBottom: 18,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
  },
  actual: {
    fontFamily: fonts.display,
    fontSize: 40,
    color: colors.ink,
  },
  actualUnit: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.muted,
  },
  delta: {
    marginTop: 6,
    marginBottom: 20,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.basil,
  },
  deltaOver: {
    color: colors.sauce,
  },
  moods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
});
