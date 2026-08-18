/**
 * Home screen widget mood + snapshot (BUILD_SPEC.md §10).
 * Pure computation split from I/O, same shape as streakService.ts / streakLogic.ts.
 * The widget extension never runs this logic itself — the app computes once and
 * writes the result (compute-don't-store pattern, same as Insights/Routines).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { localDateString } from '@/lib/streakLogic';
import type { Profile, Routine } from '@/types/task';

export type WidgetMood =
  | 'calm'
  | 'alert'
  | 'worried'
  | 'sad'
  | 'completed'
  | 'resting'
  | 'freeze'
  | 'happy';

export type WidgetSnapshot = {
  mood: WidgetMood;
  streakCount: number;
  routineName: string | null;
  /** Paired with routineName — lets a widget tap deep-link straight into that routine's timer (§10.7). */
  dueRoutineId: string | null;
  reminderTime: string | null;
  taskLine: string;
  subLine: string;
};

const FREEZE_SAVED_DATE_KEY = 'timesense.widget.freeze_saved_date';
const MILESTONE_SHOWN_DATE_KEY = 'timesense.widget.milestone_shown_date';

/**
 * Call once from recordStreakOnTaskComplete's result. freezeSpent/freezeEarned are one-shot
 * events tied to the moment of completion, so they need a stored "show for one day" flag.
 * A streak *reset* doesn't need one — it's re-derivable any time by peeking at
 * applyStreakOnTaskComplete without persisting (see streakLostToday() below), because a
 * reset is really just "the gap since lastActiveDate is too large," which stays true
 * regardless of when you check it.
 */
export async function markWidgetOneDayFlags(
  today: string,
  flags: { freezeSpent: boolean; freezeEarned: boolean },
): Promise<void> {
  if (flags.freezeSpent) {
    await AsyncStorage.setItem(FREEZE_SAVED_DATE_KEY, today);
  }
  if (flags.freezeEarned) {
    await AsyncStorage.setItem(MILESTONE_SHOWN_DATE_KEY, today);
  }
}

/** Read-only: would evaluating the streak today produce a reset, without recording anything? */
async function streakLostToday(
  profile: Pick<Profile, 'streakCount' | 'freezesAvailable' | 'lastActiveDate'>,
  today: string,
): Promise<boolean> {
  if (profile.lastActiveDate == null || profile.lastActiveDate === today) return false;
  const { applyStreakOnTaskComplete } = await import('@/lib/streakLogic');
  return applyStreakOnTaskComplete(
    {
      streakCount: profile.streakCount,
      freezesAvailable: profile.freezesAvailable,
      lastActiveDate: profile.lastActiveDate,
    },
    today,
  ).reset;
}

async function consumeOneDayFlag(key: string, today: string): Promise<boolean> {
  const stored = await AsyncStorage.getItem(key);
  if (stored !== today) return false;
  return true;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function formatReminderTime(hour: number, minute: number): string {
  const h = ((hour + 11) % 12) + 1;
  const suffix = hour < 12 ? 'AM' : 'PM';
  return `${h}:${pad2(minute)} ${suffix}`;
}

export type MoodInputs = {
  profile: Pick<Profile, 'streakCount' | 'lastActiveDate'>;
  /** Routine due today (§9.3), nearest-upcoming if several — open question in BUILD_SPEC §10.9. */
  dueRoutine: Routine | null;
  /** True if dueRoutine already has a completed task row today (routineId + endedAt). */
  dueRoutineCompletedToday: boolean;
  streakLostToday: boolean;
  freezeSavedToday: boolean;
  milestoneToday: boolean;
  now: Date;
  /** Hours-before-reminder window that flips Calm → Reminder. */
  reminderWindowHours?: number;
  /** Hours-before-end-of-day that flips Reminder → Last Chance. */
  lastChanceWindowHours?: number;
};

/** Pure state-table implementation of BUILD_SPEC.md §10.2. Unit-test this directly. */
export function computeWidgetMood(input: MoodInputs): WidgetSnapshot {
  const {
    profile,
    dueRoutine,
    dueRoutineCompletedToday,
    streakLostToday,
    freezeSavedToday,
    milestoneToday,
    now,
    reminderWindowHours = 3,
    lastChanceWindowHours = 2,
  } = input;

  const streakCount = profile.streakCount;

  if (streakLostToday) {
    return {
      mood: 'sad',
      streakCount,
      routineName: null,
      dueRoutineId: null,
      reminderTime: null,
      taskLine: 'Start a new streak today',
      subLine: 'Yesterday was missed',
    };
  }

  if (dueRoutine && dueRoutineCompletedToday) {
    return {
      mood: 'completed',
      streakCount,
      routineName: dueRoutine.name,
      dueRoutineId: dueRoutine.id,
      reminderTime: formatReminderTime(dueRoutine.reminderHour, dueRoutine.reminderMinute),
      taskLine: `${dueRoutine.name} — done!`,
      subLine: 'See you tomorrow',
    };
  }

  if (milestoneToday) {
    return {
      mood: 'happy',
      streakCount,
      routineName: dueRoutine?.name ?? null,
      dueRoutineId: dueRoutine?.id ?? null,
      reminderTime: null,
      taskLine: `${streakCount}-day streak!`,
      subLine: 'New freeze earned',
    };
  }

  if (freezeSavedToday) {
    return {
      mood: 'freeze',
      streakCount,
      routineName: dueRoutine?.name ?? null,
      dueRoutineId: dueRoutine?.id ?? null,
      reminderTime: null,
      taskLine: 'A freeze covered yesterday',
      subLine: '1 freeze left',
    };
  }

  if (!dueRoutine) {
    return {
      mood: 'resting',
      streakCount,
      routineName: null,
      dueRoutineId: null,
      reminderTime: null,
      taskLine: 'No routines today',
      subLine: 'Enjoy the break',
    };
  }

  const reminderAt = new Date(now);
  reminderAt.setHours(dueRoutine.reminderHour, dueRoutine.reminderMinute, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const msUntilReminder = reminderAt.getTime() - now.getTime();
  const msUntilEndOfDay = endOfDay.getTime() - now.getTime();
  const hourMs = 60 * 60 * 1000;

  const reminderTimeLabel = formatReminderTime(
    dueRoutine.reminderHour,
    dueRoutine.reminderMinute,
  );

  if (msUntilEndOfDay <= lastChanceWindowHours * hourMs) {
    const hoursLeft = Math.max(1, Math.ceil(msUntilEndOfDay / hourMs));
    return {
      mood: 'worried',
      streakCount,
      routineName: dueRoutine.name,
      dueRoutineId: dueRoutine.id,
      reminderTime: reminderTimeLabel,
      taskLine: `Streak ends in ${hoursLeft} hours!`,
      subLine: `${dueRoutine.name} not started`,
    };
  }

  if (msUntilReminder <= reminderWindowHours * hourMs) {
    return {
      mood: 'alert',
      streakCount,
      routineName: dueRoutine.name,
      dueRoutineId: dueRoutine.id,
      reminderTime: reminderTimeLabel,
      taskLine: `Don't forget: ${dueRoutine.name}`,
      subLine: `Today, ${reminderTimeLabel}`,
    };
  }

  return {
    mood: 'calm',
    streakCount,
    routineName: dueRoutine.name,
    dueRoutineId: dueRoutine.id,
    reminderTime: reminderTimeLabel,
    taskLine: `${dueRoutine.name} · ${reminderTimeLabel}`,
    subLine: 'Plenty of time',
  };
}

const LAST_CHANCE_TRIGGER_ID = 'timesense.widget.last_chance_trigger';
/** Must match computeWidgetMood's default lastChanceWindowHours (2h before midnight = 22:00). */
const LAST_CHANCE_TRIGGER_HOUR = 22;

/**
 * Schedule a once-daily silent local notification purely to wake the app and recompute the
 * widget mood at the Calm/Reminder → Last Chance boundary (§10.6) — the app itself has no way
 * to run code while closed otherwise. `lib/timerFeedback.ts`'s notification handler is taught
 * to suppress the visible alert for this one via `data.widgetSilent`. Idempotent: re-scheduling
 * with the same identifier replaces the previous trigger rather than stacking duplicates, so
 * it's safe to call on every cold start.
 */
export async function ensureLastChanceWidgetTrigger(): Promise<void> {
  if (Platform.OS === 'web') return;
  const current = await Notifications.getPermissionsAsync();
  if (!current.granted) return; // don't prompt here — routine/timer flows already own that ask

  await Notifications.scheduleNotificationAsync({
    identifier: LAST_CHANCE_TRIGGER_ID,
    content: {
      title: '',
      body: '',
      data: { widgetSilent: true },
      sound: false,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: LAST_CHANCE_TRIGGER_HOUR,
      minute: 0,
    },
  });
}

/**
 * Gather live state, compute the mood, and write the snapshot for the Android widget to read.
 * Call after any event that could change mood: task complete, routine due-status change,
 * cold start / midnight rollover.
 */
export async function recomputeAndWriteWidgetSnapshot(
  userId: string | null | undefined,
  now: Date = new Date(),
): Promise<WidgetSnapshot> {
  const [{ getLocalProfile }, { listActiveRoutinesDueToday }, { listRecentTasks }] =
    await Promise.all([
      import('@/lib/tasksDb'),
      import('@/lib/routinesDb'),
      import('@/lib/tasksDb'),
    ]);
  const { profileIdForAuth } = await import('@/lib/streakService');

  const today = localDateString(now);
  const profile = await getLocalProfile(profileIdForAuth(userId));
  const dueRoutines = await listActiveRoutinesDueToday(now);
  const dueRoutine = dueRoutines[0] ?? null;

  let dueRoutineCompletedToday = false;
  if (dueRoutine) {
    const recent = await listRecentTasks(50);
    dueRoutineCompletedToday = recent.some(
      (t) =>
        t.routineId === dueRoutine.id &&
        t.endedAt != null &&
        localDateString(new Date(t.endedAt)) === today,
    );
  }

  const profileForMood = profile ?? {
    streakCount: 0,
    freezesAvailable: 0,
    lastActiveDate: null,
  };
  const lostToday =
    !dueRoutineCompletedToday && (await streakLostToday(profileForMood, today));

  const freezeSavedToday = await consumeOneDayFlag(FREEZE_SAVED_DATE_KEY, today);
  const milestoneToday = await consumeOneDayFlag(MILESTONE_SHOWN_DATE_KEY, today);

  const snapshot = computeWidgetMood({
    profile: profileForMood,
    dueRoutine,
    dueRoutineCompletedToday,
    streakLostToday: lostToday,
    freezeSavedToday,
    milestoneToday,
    now,
  });

  await writeWidgetSnapshot(snapshot);
  return snapshot;
}

const SNAPSHOT_STORAGE_KEY = 'timesense.widget.snapshot.v1';

/** Read the last-persisted snapshot — used by widgets/widgetTaskHandler.ts on cold widget events. */
export async function readWidgetSnapshot(): Promise<WidgetSnapshot | null> {
  const raw = await AsyncStorage.getItem(SNAPSHOT_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as WidgetSnapshot;
  } catch {
    return null;
  }
}

/**
 * Persist the snapshot for the Android widget extension to read (§10.5), then push a live
 * update if a widget is currently on the home screen. Persisting first matters because
 * WIDGET_ADDED / WIDGET_RESIZED fire the task handler headlessly, without this closure.
 */
export async function writeWidgetSnapshot(snapshot: WidgetSnapshot): Promise<void> {
  await AsyncStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshot));
  try {
    const { requestWidgetUpdate } = await import('react-native-android-widget');
    const { StreakWidget, widgetSizeFor } = await import('@/widgets/StreakWidget');
    await requestWidgetUpdate({
      widgetName: 'Streak',
      renderWidget: (info) => StreakWidget(snapshot, widgetSizeFor(info.width)),
    });
  } catch {
    // Not an Android build, or the widget module isn't linked (e.g. Expo Go) — the snapshot
    // is still persisted for whenever a real widget-capable build reads it.
  }
}
