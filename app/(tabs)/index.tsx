import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TsButton } from '@/components/ui/TsButton';
import { TsCard } from '@/components/ui/TsCard';
import { TsChip } from '@/components/ui/TsChip';
import { TsSectionLabel } from '@/components/ui/TsSectionLabel';
import { colors, fonts } from '@/constants/theme';
import { deleteRoutineFully, pauseRoutine } from '@/lib/routineNotifications';
import { listActiveRoutinesDueToday } from '@/lib/routinesDb';
import { getStreakProfile } from '@/lib/streakService';
import { listRecentTasks } from '@/lib/tasksDb';
import { formatClock } from '@/lib/timerMath';
import { namesFromUserMetadata } from '@/lib/userNames';
import { useAuthStore } from '@/stores/authStore';
import type { Routine, Task } from '@/types/task';

function greetingForHour(h: number): string {
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Hey there';
}

/** Guest when signed out; first name (or sensible fallback) when signed in. */
function greetingName(
  mode: ReturnType<typeof useAuthStore.getState>['mode'],
  user: ReturnType<typeof useAuthStore.getState>['user'],
): string {
  if (mode !== 'signed_in' || !user) return 'Guest';
  const { firstName, displayName } = namesFromUserMetadata(user.user_metadata);
  const fromFirst = firstName?.split(/\s+/)[0];
  if (fromFirst) return fromFirst;
  const fromDisplay = displayName?.split(/\s+/)[0];
  if (fromDisplay) return fromDisplay;
  const fromEmail = user.email?.split('@')[0];
  if (fromEmail) return fromEmail;
  return 'Guest';
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const mode = useAuthStore((s) => s.mode);
  const user = useAuthStore((s) => s.user);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [routinesDueToday, setRoutinesDueToday] = useState<Routine[]>([]);
  const [streak, setStreak] = useState(0);
  const [freezes, setFreezes] = useState(0);

  const reload = useCallback(async () => {
    const rows = await listRecentTasks(20);
    setTasks(rows.filter((t) => t.actualSeconds != null).slice(0, 8));
    setRoutinesDueToday(await listActiveRoutinesDueToday());
    const profile = await getStreakProfile(user?.id ?? null);
    setStreak(profile?.streakCount ?? 0);
    setFreezes(profile?.freezesAvailable ?? 0);
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const greeting = `${greetingForHour(new Date().getHours())}, ${greetingName(mode, user)}`;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <Text style={styles.greeting}>{greeting}</Text>
      {streak > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {streak}-day streak
            {freezes > 0 ? ` · ${freezes} freeze${freezes === 1 ? '' : 's'}` : ''}
          </Text>
        </View>
      ) : (
        <View style={[styles.badge, styles.badgeMuted]}>
          <Text style={styles.badgeTextMuted}>Start a streak</Text>
        </View>
      )}

      <TsButton
        label="+ New Timer"
        block
        onPress={() => router.push('/timer/new')}
        style={{ marginTop: 8, marginBottom: 12, paddingVertical: 16 }}
      />

      <View style={styles.chips}>
        <TsChip label="5 min" onPress={() => router.push('/timer/new?minutes=5')} />
        <TsChip label="25 min" onPress={() => router.push('/timer/new?minutes=25')} />
        <TsChip label="Custom" onPress={() => router.push('/timer/new')} />
      </View>

      {routinesDueToday.length > 0 ? (
        <>
          <TsSectionLabel>Today&apos;s Routines</TsSectionLabel>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.routineScroll}>
            {routinesDueToday.map((routine) => (
              <RoutineCard
                key={routine.id}
                routine={routine}
                onReload={reload}
              />
            ))}
          </ScrollView>
        </>
      ) : null}

      <TsSectionLabel>Recent</TsSectionLabel>

      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            No finished timers yet. Start one — completed runs show up here.
          </Text>
        }
        renderItem={({ item }) => <RecentRow task={item} />}
      />

      {mode !== 'signed_in' ? (
        <Pressable onPress={() => router.push('/auth')} style={styles.signInHint}>
          <Text style={styles.signInHintText}>Sign in to back up your history</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function RecentRow({ task }: { task: Task }) {
  const predicted = formatClock(task.predictedSeconds);
  const actual =
    task.actualSeconds != null ? formatClock(task.actualSeconds) : '—';
  return (
    <TsCard style={styles.row}>
      <Text style={styles.rowTitle}>{task.name}</Text>
      <Text style={styles.rowMeta}>
        Predicted {predicted} · Actual {actual}
      </Text>
    </TsCard>
  );
}

function formatReminderTime(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${String(minute).padStart(2, '0')} ${period}`;
}

function RoutineCard({
  routine,
  onReload,
}: {
  routine: Routine;
  onReload: () => void | Promise<void>;
}) {
  const minutes = Math.round(routine.predictedSeconds / 60);
  const time = formatReminderTime(routine.reminderHour, routine.reminderMinute);

  const onPress = () => {
    router.push({
      pathname: '/timer/new',
      params: {
        name: routine.name,
        category: routine.category ?? undefined,
        minutes: String(minutes),
        visualStyle: routine.visualStyle,
      },
    });
  };

  const onLongPress = () => {
    Alert.alert(routine.name, 'Manage this routine', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Pause',
        onPress: () => void pauseRoutine(routine.id).then(onReload),
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => void deleteRoutineFully(routine.id).then(onReload),
      },
    ]);
  };

  return (
    <Pressable onPress={onPress} onLongPress={onLongPress}>
      <TsCard style={styles.routineCard}>
        <Text style={styles.routineName} numberOfLines={1}>
          {routine.name}
        </Text>
        <Text style={styles.routineMeta}>
          {minutes} min · {time}
        </Text>
      </TsCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.plate,
    paddingHorizontal: 20,
  },
  greeting: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: colors.ink,
    marginBottom: 10,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.basil,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 999,
    marginBottom: 8,
  },
  badgeMuted: {
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.cream,
  },
  badgeTextMuted: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: colors.muted,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
  },
  routineScroll: {
    gap: 8,
    paddingBottom: 12,
    paddingRight: 4,
  },
  routineCard: {
    width: 128,
  },
  routineName: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.ink,
  },
  routineMeta: {
    marginTop: 4,
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.muted,
  },
  list: {
    paddingBottom: 24,
    gap: 10,
  },
  empty: {
    fontFamily: fonts.body,
    color: colors.muted,
    lineHeight: 20,
  },
  row: {
    marginBottom: 0,
  },
  rowTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.ink,
  },
  rowMeta: {
    marginTop: 4,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
  },
  signInHint: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  signInHintText: {
    fontFamily: fonts.bodyMedium,
    color: colors.sauce,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});
