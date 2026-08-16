import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TsCard } from '@/components/ui/TsCard';
import { colors, fonts, STYLE_OPTIONS } from '@/constants/theme';
import { describeEndDate, describeRecurrenceDays } from '@/lib/routineLogic';
import {
  deleteRoutineFully,
  pauseRoutine,
  resumeRoutine,
} from '@/lib/routineNotifications';
import { listRoutines } from '@/lib/routinesDb';
import { recomputeAndWriteWidgetSnapshot } from '@/lib/widgetSnapshot';
import { useAuthStore } from '@/stores/authStore';
import type { Routine } from '@/types/task';

export default function RoutinesScreen() {
  const insets = useSafeAreaInsets();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const userId = useAuthStore((s) => s.user?.id) ?? null;

  const reload = useCallback(async () => {
    const all = await listRoutines();
    all.sort((a, b) => Number(b.active) - Number(a.active));
    setRoutines(all);
    void recomputeAndWriteWidgetSnapshot(userId);
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const onToggleActive = async (routine: Routine, next: boolean) => {
    setBusyId(routine.id);
    try {
      if (next) {
        await resumeRoutine(routine.id);
      } else {
        await pauseRoutine(routine.id);
      }
      await reload();
    } finally {
      setBusyId(null);
    }
  };

  const onDelete = (routine: Routine) => {
    Alert.alert(
      'Delete this routine?',
      'Your past sessions stay in your history — only the recurring reminder is removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Routine',
          style: 'destructive',
          onPress: () => void deleteRoutineFully(routine.id).then(reload),
        },
      ],
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12, paddingBottom: insets.bottom }]}>
      <View style={styles.topbar}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>Routines</Text>
        <Pressable onPress={() => router.push('/timer/new?repeat=1')} hitSlop={8}>
          <Text style={styles.addBtn}>+ New</Text>
        </Pressable>
      </View>

      <FlatList
        data={routines}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState />}
        renderItem={({ item }) => (
          <RoutineRow
            routine={item}
            busy={busyId === item.id}
            onPress={() =>
              router.push({ pathname: '/routines/[id]', params: { id: item.id } })
            }
            onToggleActive={(next) => void onToggleActive(item, next)}
            onLongPress={() => onDelete(item)}
          />
        )}
      />
    </View>
  );
}

function RoutineRow({
  routine,
  busy,
  onPress,
  onToggleActive,
  onLongPress,
}: {
  routine: Routine;
  busy: boolean;
  onPress: () => void;
  onToggleActive: (next: boolean) => void;
  onLongPress: () => void;
}) {
  const icon = STYLE_OPTIONS.find((s) => s.value === routine.visualStyle)?.icon ?? 'timer-outline';
  const minutes = Math.round(routine.predictedSeconds / 60);
  const subtitle = routine.active
    ? `${describeRecurrenceDays(routine.recurrenceDays)} · ${minutes} min · ${describeEndDate(routine.endDate)}`
    : 'Paused';

  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} disabled={busy}>
      <TsCard style={[styles.row, !routine.active && styles.rowPaused]}>
        <View style={styles.rowIcon}>
          <MaterialCommunityIcons name={icon} size={18} color={colors.board} />
        </View>
        <View style={styles.rowBody}>
          <Text style={styles.rowName} numberOfLines={1}>
            {routine.name}
          </Text>
          <Text style={styles.rowMeta} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        <Switch
          value={routine.active}
          onValueChange={onToggleActive}
          disabled={busy}
          trackColor={{ false: colors.border, true: colors.basil }}
          thumbColor={colors.cream}
        />
      </TsCard>
    </Pressable>
  );
}

function EmptyState() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>🔁</Text>
      <Text style={styles.emptyTitle}>No routines yet</Text>
      <Text style={styles.emptyBody}>
        Turn any timer into a repeating reminder — Fridays for leg day, every weekday for
        inbox zero, whatever runs on a schedule for you.
      </Text>
      <Pressable onPress={() => router.push('/timer/new?repeat=1')}>
        <Text style={styles.addBtn}>+ New Routine</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.plate,
    paddingHorizontal: 20,
  },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  back: {
    fontFamily: fonts.bodyMedium,
    color: colors.muted,
    fontSize: 15,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.ink,
  },
  addBtn: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.sauce,
  },
  list: {
    paddingBottom: 24,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowPaused: {
    opacity: 0.55,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.crust,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  rowName: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.ink,
  },
  rowMeta: {
    marginTop: 3,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
  },
  empty: {
    alignItems: 'center',
    textAlign: 'center',
    paddingTop: 48,
    paddingHorizontal: 16,
  },
  emptyIcon: {
    fontSize: 34,
    marginBottom: 10,
  },
  emptyTitle: {
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.ink,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyBody: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 18,
  },
});
