/**
 * Gentle re-entry nudge (BUILD_SPEC §7.4) — a single low-pressure local notification if the
 * app hasn't been opened in a few days. No backend push infra: reschedule a one-time
 * notification N days out on every cold start/foreground, so it only ever fires after a real
 * gap (each open pushes it back out before it can fire).
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const REENTRY_NUDGE_ID = 'timesense.reengagement.reentry_nudge';
export const REENTRY_NUDGE_DAYS = 3;
export const REENTRY_NUDGE_HOUR = 11;

/** Pure date math, kept separate from the Notifications call so it's unit-testable. */
export function computeReentryNudgeDate(
  now: Date = new Date(),
  days: number = REENTRY_NUDGE_DAYS,
  hour: number = REENTRY_NUDGE_HOUR,
): Date {
  const fireDate = new Date(now);
  fireDate.setDate(fireDate.getDate() + days);
  fireDate.setHours(hour, 0, 0, 0);
  return fireDate;
}

/**
 * Reschedule the re-entry nudge for `REENTRY_NUDGE_DAYS` from now. Idempotent: scheduling
 * again with the same identifier replaces the previous trigger, so it's safe to call on every
 * cold start/foreground — an active user keeps pushing their own nudge further into the
 * future, and it only actually fires once nobody's opened the app to reschedule it.
 */
export async function ensureReentryNudge(now: Date = new Date()): Promise<void> {
  if (Platform.OS === 'web') return;
  const current = await Notifications.getPermissionsAsync();
  if (!current.granted) return; // don't prompt here — routine/timer flows already own that ask

  await Notifications.scheduleNotificationAsync({
    identifier: REENTRY_NUDGE_ID,
    content: {
      title: 'No worries',
      body: 'Want to log just one thing today?',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: computeReentryNudgeDate(now),
    },
  });
}

export async function cancelReentryNudge(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelScheduledNotificationAsync(REENTRY_NUDGE_ID).catch(() => {});
}
