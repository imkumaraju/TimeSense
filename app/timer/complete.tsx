import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TsButton } from '@/components/ui/TsButton';
import { TsChip } from '@/components/ui/TsChip';
import { TsSectionLabel } from '@/components/ui/TsSectionLabel';
import { colors, fonts } from '@/constants/theme';
import { syncNow } from '@/lib/syncService';
import { completeTask } from '@/lib/tasksDb';
import { recomputeAndWriteWidgetSnapshot } from '@/lib/widgetSnapshot';
import { useActiveTimerStore } from '@/stores/activeTimerStore';
import { useAuthStore } from '@/stores/authStore';
import type { MoodTag } from '@/types/task';

const MOODS: Array<{ label: string; value: MoodTag }> = [
  { label: 'Too fast', value: 'too_fast' },
  { label: 'About right', value: 'about_right' },
  { label: 'Dragged on', value: 'dragged_on' },
];

function clampMinutes(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(24 * 60, Math.round(n)));
}

export default function TaskCompleteScreen() {
  const insets = useSafeAreaInsets();
  const meta = useActiveTimerStore((s) => s.meta);
  const snapshot = useActiveTimerStore((s) => s.snapshot);
  const getDerived = useActiveTimerStore((s) => s.getDerived);
  const clear = useActiveTimerStore((s) => s.clear);
  const mode = useAuthStore((s) => s.mode);
  const user = useAuthStore((s) => s.user);

  const derived = getDerived(Date.now());
  const [mood, setMood] = useState<MoodTag | null>(null);
  const [saving, setSaving] = useState(false);
  const [actualMinutes, setActualMinutes] = useState(1);
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (seeded || !derived) return;
    setActualMinutes(clampMinutes(derived.elapsedSeconds / 60));
    setSeeded(true);
  }, [derived, seeded]);

  const predictedMins = snapshot
    ? Math.max(1, Math.round(snapshot.durationSeconds / 60))
    : actualMinutes;
  const delta = actualMinutes - predictedMins;

  const deltaLabel = useMemo(() => {
    if (delta === 0) return 'Right on your prediction';
    if (delta > 0) return `${delta}m over your prediction`;
    return `${Math.abs(delta)}m under your prediction`;
  }, [delta]);

  if (!meta || !derived) {
    return <View style={styles.container} />;
  }

  const onSave = async () => {
    if (!meta.taskId || saving) return;
    setSaving(true);
    try {
      const mins = clampMinutes(actualMinutes);
      await completeTask(meta.taskId, mins * 60, Date.now(), mood);
      void recomputeAndWriteWidgetSnapshot(user?.id ?? null);
      clear();
      if (mode === 'signed_in') {
        void syncNow();
      }
      router.replace('/');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 20 },
      ]}>
      <Text style={styles.done}>Done!</Text>
      <Text style={styles.title}>Nice work!</Text>
      <Text style={styles.sub}>How long did that actually take?</Text>

      <View style={styles.stepperRow}>
        <Pressable
          style={styles.stepperBtn}
          onPress={() => setActualMinutes((m) => clampMinutes(m - 1))}
          hitSlop={8}>
          <Text style={styles.stepperBtnText}>−</Text>
        </Pressable>
        <Text style={styles.actual}>
          {actualMinutes}
          <Text style={styles.actualUnit}> min</Text>
        </Text>
        <Pressable
          style={styles.stepperBtn}
          onPress={() => setActualMinutes((m) => clampMinutes(m + 1))}
          hitSlop={8}>
          <Text style={styles.stepperBtnText}>+</Text>
        </Pressable>
      </View>
      <Text style={[styles.delta, delta > 0 && styles.deltaOver]}>
        {deltaLabel}
      </Text>

      <TsSectionLabel style={{ alignSelf: 'center', marginTop: 8 }}>
        How did it feel?
      </TsSectionLabel>
      <View style={styles.moods}>
        {MOODS.map((m) => (
          <TsChip
            key={m.value}
            label={m.label}
            active={mood === m.value}
            onPress={() => setMood((cur) => (cur === m.value ? null : m.value))}
          />
        ))}
      </View>

      <View style={{ flex: 1 }} />

      {saving ? (
        <ActivityIndicator color={colors.sauce} style={{ marginBottom: 12 }} />
      ) : null}
      <TsButton
        label="Save"
        block
        disabled={saving}
        onPress={() => void onSave()}
      />
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
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.ink,
    lineHeight: 32,
  },
  actual: {
    fontFamily: fonts.display,
    fontSize: 40,
    color: colors.ink,
    minWidth: 100,
    textAlign: 'center',
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
