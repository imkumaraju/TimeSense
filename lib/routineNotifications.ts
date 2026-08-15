/**
 * Schedule / cancel OS weekly reminders for routines (local only).
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import {
  jsWeekdayToExpo,
  parseRecurrenceDays,
} from '@/lib/routineLogic';
import {
  getRoutineById,
  listRoutineNotifications,
  listRoutinesPastEndDate,
  replaceRoutineNotifications,
  setRoutineActive,
} from '@/lib/routinesDb';
import type { Routine } from '@/types/task';

export async function ensureRoutineNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const next = await Notifications.requestPermissionsAsync();
  return next.granted;
}

export async function cancelRoutineNotifications(
  routineId: string,
): Promise<void> {
  if (Platform.OS === 'web') {
    await replaceRoutineNotifications(routineId, []);
    return;
  }
  const existing = await listRoutineNotifications(routineId);
  await Promise.all(
    existing.map((e) =>
      Notifications.cancelScheduledNotificationAsync(e.notificationId).catch(
        () => {},
      ),
    ),
  );
  await replaceRoutineNotifications(routineId, []);
}

/** Cancel all mapped notifs and reschedule from the routine rule. */
export async function rescheduleRoutineNotifications(
  routine: Routine,
): Promise<void> {
  await cancelRoutineNotifications(routine.id);

  if (!routine.active || Platform.OS === 'web') return;

  const granted = await ensureRoutineNotificationPermission();
  if (!granted) return;

  const days = parseRecurrenceDays(routine.recurrenceDays);
  const entries: Array<{ weekday: number; notificationId: string }> = [];

  for (const jsDay of days) {
    const expoDay = jsWeekdayToExpo(jsDay);
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: routine.name,
        body: `Time for ${routine.name}.`,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: expoDay,
        hour: routine.reminderHour,
        minute: routine.reminderMinute,
      },
    });
    entries.push({ weekday: jsDay, notificationId: id });
  }

  await replaceRoutineNotifications(routine.id, entries);
}

export async function pauseRoutine(routineId: string): Promise<void> {
  await cancelRoutineNotifications(routineId);
  await setRoutineActive(routineId, false);
}

/** Reactivate a paused routine and reschedule its weekly reminders. */
export async function resumeRoutine(routineId: string): Promise<void> {
  const routine = await setRoutineActive(routineId, true);
  if (routine) {
    await rescheduleRoutineNotifications(routine);
  }
}

export async function deleteRoutineFully(routineId: string): Promise<void> {
  await cancelRoutineNotifications(routineId);
  const { deleteRoutineLocal } = await import('@/lib/routinesDb');
  await deleteRoutineLocal(routineId);
  try {
    const { isSupabaseConfigured, supabase } = await import('@/lib/supabase');
    if (isSupabaseConfigured) {
      await supabase.from('routines').delete().eq('id', routineId);
    }
  } catch {
    // best-effort remote delete
  }
}

/** On app open: cancel notifs for routines past end_date and deactivate them. */
export async function cancelExpiredRoutineNotifications(
  on: Date = new Date(),
): Promise<number> {
  const expired = await listRoutinesPastEndDate(on);
  for (const r of expired) {
    await cancelRoutineNotifications(r.id);
    await setRoutineActive(r.id, false);
  }
  return expired.length;
}

export async function syncNotificationsForRoutineId(
  routineId: string,
): Promise<void> {
  const routine = await getRoutineById(routineId);
  if (!routine) return;
  if (!routine.active) {
    await cancelRoutineNotifications(routineId);
    return;
  }
  await rescheduleRoutineNotifications(routine);
}
