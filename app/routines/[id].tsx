import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RepeatFields, defaultEndDate, type RepeatFieldsValue } from '@/components/routines/RepeatFields';
import { TsButton } from '@/components/ui/TsButton';
import { colors, fonts } from '@/constants/theme';
import { localDateString, parseRecurrenceDays } from '@/lib/routineLogic';
import { deleteRoutineFully, rescheduleRoutineNotifications } from '@/lib/routineNotifications';
import { getRoutineById, updateRoutine } from '@/lib/routinesDb';
import { recomputeAndWriteWidgetSnapshot } from '@/lib/widgetSnapshot';
import type { Routine } from '@/types/task';

function parseLocalDate(raw: string): Date {
  const [y, m, d] = raw.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export default function EditRoutineScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [routine, setRoutine] = useState<Routine | null>(null);
  const [name, setName] = useState('');
  const [minutes, setMinutes] = useState(25);
  const [repeatFields, setRepeatFields] = useState<RepeatFieldsValue>({
    recurrenceDays: [],
    reminderHour: 9,
    reminderMinute: 0,
    endMode: 'ongoing',
    endDate: defaultEndDate(),
  });
  const [busy, setBusy] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) {
      setNotFound(true);
      return;
    }
    void getRoutineById(id).then((r) => {
      if (!r) {
        setNotFound(true);
        return;
      }
      setRoutine(r);
      setName(r.name);
      setMinutes(Math.round(r.predictedSeconds / 60));
      setRepeatFields({
        recurrenceDays: parseRecurrenceDays(r.recurrenceDays),
        reminderHour: r.reminderHour,
        reminderMinute: r.reminderMinute,
        endMode: r.endDate ? 'date' : 'ongoing',
        endDate: r.endDate ? parseLocalDate(r.endDate) : defaultEndDate(),
      });
    });
  }, [id]);

  const clampMinutes = (n: number) => Math.max(1, Math.min(240, Math.round(n)));

  const onSave = async () => {
    if (!routine) return;
    setBusy(true);
    try {
      const updated = await updateRoutine(routine.id, {
        name,
        predictedSeconds: clampMinutes(minutes) * 60,
        recurrenceDays: repeatFields.recurrenceDays,
        reminderHour: repeatFields.reminderHour,
        reminderMinute: repeatFields.reminderMinute,
        endDate:
          repeatFields.endMode === 'date'
            ? localDateString(repeatFields.endDate)
            : null,
      });
      if (updated) {
        await rescheduleRoutineNotifications(updated);
        void recomputeAndWriteWidgetSnapshot(updated.userId);
      }
      router.back();
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  };

  const onDelete = () => {
    if (!routine) return;
    Alert.alert(
      'Delete this routine?',
      'Your past sessions stay in your history — only the recurring reminder is removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Routine',
          style: 'destructive',
          onPress: () => {
            void deleteRoutineFully(routine.id).then(() => {
              void recomputeAndWriteWidgetSnapshot(routine.userId);
              router.back();
            });
          },
        },
      ],
    );
  };

  if (!routine) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        {notFound ? (
          <Text style={styles.notFound}>
            Couldn&apos;t find that routine — it may have been deleted.
          </Text>
        ) : (
          <ActivityIndicator style={{ marginTop: 24 }} color={colors.sauce} />
        )}
      </View>
    );
  }

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
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>

        <Text style={styles.title}>Edit routine</Text>

        <TextInput
          style={styles.input}
          placeholder="What are you doing? (optional)"
          placeholderTextColor={colors.muted}
          value={name}
          onChangeText={setName}
        />

        <View style={styles.stepper}>
          <Pressable
            style={styles.stepBtn}
            onPress={() => setMinutes((m) => clampMinutes(m - 1))}
            accessibilityLabel="Decrease minutes">
            <Text style={styles.stepBtnText}>–</Text>
          </Pressable>
          <Text style={styles.minutes}>
            {minutes}
            <Text style={styles.minutesUnit}> min</Text>
          </Text>
          <Pressable
            style={styles.stepBtn}
            onPress={() => setMinutes((m) => clampMinutes(m + 1))}
            accessibilityLabel="Increase minutes">
            <Text style={styles.stepBtnText}>+</Text>
          </Pressable>
        </View>

        <RepeatFields value={repeatFields} onChange={setRepeatFields} />

        <View style={{ flex: 1, minHeight: 24 }} />

        <TsButton
          label="Save Changes"
          block
          disabled={busy || repeatFields.recurrenceDays.length === 0}
          onPress={() => void onSave()}
          style={{ marginBottom: 10 }}
        />
        <Pressable onPress={onDelete} disabled={busy} style={styles.deleteBtn}>
          <Text style={styles.deleteBtnText}>Delete Routine</Text>
        </Pressable>
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
  notFound: {
    fontFamily: fonts.body,
    color: colors.muted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 24,
    paddingHorizontal: 24,
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
    marginBottom: 18,
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
  minutesUnit: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.muted,
  },
  deleteBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.sauce,
  },
  deleteBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.sauce,
  },
});
