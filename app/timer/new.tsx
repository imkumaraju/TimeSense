import { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RepeatFields, defaultEndDate, type RepeatFieldsValue } from '@/components/routines/RepeatFields';
import { TsButton } from '@/components/ui/TsButton';
import { TsChip } from '@/components/ui/TsChip';
import { TsSectionLabel } from '@/components/ui/TsSectionLabel';
import {
  CATEGORY_OPTIONS,
  STYLE_OPTIONS,
  colors,
  fonts,
} from '@/constants/theme';
import { localDateString } from '@/lib/routineLogic';
import { rescheduleRoutineNotifications } from '@/lib/routineNotifications';
import { createRoutine } from '@/lib/routinesDb';
import { getDefaultVisualStyle } from '@/lib/settings';
import { createTask, listRecentTasks } from '@/lib/tasksDb';
import { useActiveTimerStore } from '@/stores/activeTimerStore';
import { useAuthStore } from '@/stores/authStore';
import type { TaskCategory, VisualStyle } from '@/types/task';

export default function NewTimerScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    minutes?: string;
    name?: string;
    category?: string;
    visualStyle?: string;
    repeat?: string;
  }>();
  const initialMinutes = Number(params.minutes) || 25;

  const [name, setName] = useState(params.name ?? '');
  const [minutes, setMinutes] = useState(initialMinutes);
  const [minutesText, setMinutesText] = useState(String(initialMinutes));
  const [editingMinutes, setEditingMinutes] = useState(false);
  const [visualStyle, setVisualStyle] = useState<VisualStyle>(
    (params.visualStyle as VisualStyle) || 'pizza',
  );
  const [category, setCategory] = useState<TaskCategory>(
    (params.category as TaskCategory) || 'chores',
  );
  const [hintMinutes, setHintMinutes] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const [repeat, setRepeat] = useState(params.repeat === '1');
  const [repeatFields, setRepeatFields] = useState<RepeatFieldsValue>({
    recurrenceDays: [],
    reminderHour: 9,
    reminderMinute: 0,
    endMode: 'ongoing',
    endDate: defaultEndDate(),
  });

  const start = useActiveTimerStore((s) => s.start);
  const user = useAuthStore((s) => s.user);

  const clampMinutes = (n: number) => Math.max(1, Math.min(240, Math.round(n)));

  const commitMinutesText = (raw: string) => {
    const parsed = Number(raw.replace(/[^\d]/g, ''));
    const next = Number.isFinite(parsed) && parsed > 0 ? clampMinutes(parsed) : minutes;
    setMinutes(next);
    setMinutesText(String(next));
    setEditingMinutes(false);
  };

  const bumpMinutes = (delta: number) => {
    const next = clampMinutes(minutes + delta);
    setMinutes(next);
    setMinutesText(String(next));
    setEditingMinutes(false);
  };

  useEffect(() => {
    if (params.visualStyle) return;
    void getDefaultVisualStyle().then(setVisualStyle);
  }, [params.visualStyle]);

  const refreshHint = useCallback(async (taskName: string) => {
    const trimmed = taskName.trim().toLowerCase();
    if (!trimmed) {
      setHintMinutes(null);
      return;
    }
    const rows = await listRecentTasks(80);
    const matches = rows.filter(
      (t) =>
        t.actualSeconds != null &&
        t.name.trim().toLowerCase() === trimmed,
    );
    if (matches.length === 0) {
      setHintMinutes(null);
      return;
    }
    const avg =
      matches.reduce((sum, t) => sum + (t.actualSeconds ?? 0), 0) /
      matches.length;
    setHintMinutes(Math.max(1, Math.round(avg / 60)));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      void refreshHint(name);
    }, 300);
    return () => clearTimeout(t);
  }, [name, refreshHint]);

  const onStart = async () => {
    const mins = editingMinutes
      ? clampMinutes(Number(minutesText) || minutes)
      : minutes;
    if (editingMinutes) {
      setMinutes(mins);
      setMinutesText(String(mins));
      setEditingMinutes(false);
    }
    const predictedSeconds = Math.max(1, mins) * 60;
    setBusy(true);
    try {
      if (repeat) {
        const routine = await createRoutine({
          name,
          category,
          predictedSeconds,
          visualStyle,
          recurrenceDays: repeatFields.recurrenceDays,
          reminderHour: repeatFields.reminderHour,
          reminderMinute: repeatFields.reminderMinute,
          endDate:
            repeatFields.endMode === 'date'
              ? localDateString(repeatFields.endDate)
              : null,
          userId: user?.id ?? null,
        });
        await rescheduleRoutineNotifications(routine);
        router.replace('/(tabs)');
        return;
      }
      const task = await createTask({
        name,
        category,
        predictedSeconds,
        visualStyle,
        userId: user?.id ?? null,
      });
      start(predictedSeconds, {
        taskId: task.id,
        name: task.name,
        description: task.description,
        category,
        visualStyle,
      });
      router.replace('/timer/active');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[
        styles.container,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 },
      ]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>Back</Text>
        </Pressable>

        <Text style={styles.title}>New timer</Text>

        <TextInput
          style={styles.input}
          placeholder="What are you doing? (optional)"
          placeholderTextColor={colors.muted}
          value={name}
          onChangeText={setName}
        />

        <TsSectionLabel>Predicted duration</TsSectionLabel>
        <View style={styles.stepper}>
          <Pressable
            style={styles.stepBtn}
            onPress={() => bumpMinutes(-1)}
            accessibilityLabel="Decrease minutes">
            <Text style={styles.stepBtnText}>–</Text>
          </Pressable>
          {editingMinutes ? (
            <View style={styles.minutesEditWrap}>
              <TextInput
                style={styles.minutesInput}
                value={minutesText}
                onChangeText={(text) => setMinutesText(text.replace(/[^\d]/g, '').slice(0, 3))}
                keyboardType="number-pad"
                selectTextOnFocus
                autoFocus
                maxLength={3}
                onBlur={() => commitMinutesText(minutesText)}
                onSubmitEditing={() => commitMinutesText(minutesText)}
                accessibilityLabel="Minutes"
              />
              <Text style={styles.minutesUnit}> min</Text>
            </View>
          ) : (
            <Pressable
              onPress={() => {
                setMinutesText(String(minutes));
                setEditingMinutes(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="Edit minutes"
              hitSlop={8}>
              <Text style={styles.minutes}>
                {minutes}
                <Text style={styles.minutesUnit}> min</Text>
              </Text>
            </Pressable>
          )}
          <Pressable
            style={styles.stepBtn}
            onPress={() => bumpMinutes(1)}
            accessibilityLabel="Increase minutes">
            <Text style={styles.stepBtnText}>+</Text>
          </Pressable>
        </View>
        {hintMinutes != null ? (
          <Text style={styles.hint}>
            usually ~{hintMinutes}m for {name.trim()}
          </Text>
        ) : (
          <View style={{ height: 18 }} />
        )}

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Repeat</Text>
          <Switch
            value={repeat}
            onValueChange={setRepeat}
            trackColor={{ false: colors.border, true: colors.basil }}
            thumbColor={colors.cream}
          />
        </View>

        {repeat ? (
          <View style={styles.repeatPanel}>
            <RepeatFields value={repeatFields} onChange={setRepeatFields} />
          </View>
        ) : null}

        <TsSectionLabel>Timer style</TsSectionLabel>
        <View style={styles.chips}>
          {STYLE_OPTIONS.map((opt) => (
            <TsChip
              key={opt.value}
              label={opt.label}
              icon={opt.icon}
              active={visualStyle === opt.value}
              onPress={() => setVisualStyle(opt.value)}
            />
          ))}
        </View>

        <TsSectionLabel>Category</TsSectionLabel>
        <View style={styles.chips}>
          {CATEGORY_OPTIONS.map((opt) => (
            <TsChip
              key={opt.value}
              label={opt.label}
              active={category === opt.value}
              onPress={() => setCategory(opt.value)}
            />
          ))}
        </View>

        <View style={{ flex: 1, minHeight: 24 }} />

        <TsButton
          label={repeat ? 'Save Routine' : 'Start Timer'}
          block
          disabled={busy || (repeat && repeatFields.recurrenceDays.length === 0)}
          onPress={() => void onStart()}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.plate,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexGrow: 1,
  },
  back: {
    fontFamily: fonts.bodyMedium,
    color: colors.muted,
    fontSize: 15,
    marginBottom: 12,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.ink,
    marginBottom: 16,
  },
  input: {
    backgroundColor: colors.cream,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: fonts.body,
    color: colors.ink,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    marginBottom: 6,
  },
  stepBtn: {
    borderWidth: 1,
    borderColor: colors.crustDark,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  stepBtnText: {
    fontFamily: fonts.bodySemi,
    fontSize: 18,
    color: colors.crustDark,
  },
  minutes: {
    fontFamily: fonts.display,
    fontSize: 36,
    color: colors.ink,
    minWidth: 90,
    textAlign: 'center',
  },
  minutesEditWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    minWidth: 110,
  },
  minutesInput: {
    fontFamily: fonts.display,
    fontSize: 36,
    color: colors.ink,
    minWidth: 56,
    textAlign: 'center',
    padding: 0,
    margin: 0,
  },
  minutesUnit: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.muted,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.basil,
    textAlign: 'center',
    marginBottom: 14,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  toggleLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.ink,
  },
  repeatPanel: {
    marginBottom: 8,
  },
});
