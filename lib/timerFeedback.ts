/**
 * Timer milestone feedback: local notifications (background) + haptics (foreground).
 * Schedule times are derived from wall-clock timer math — never from JS intervals alone.
 */

import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { getSoundHapticsEnabled } from '@/lib/settings';
import {
  deriveTimer,
  type TimerDerived,
  type TimerSnapshot,
} from '@/lib/timerMath';

export type MilestoneKind = 'halfway' | 'one_minute' | 'complete';

export type MilestoneFireFlags = {
  halfway: boolean;
  oneMinute: boolean;
  complete: boolean;
};

export const EMPTY_MILESTONE_FLAGS: MilestoneFireFlags = {
  halfway: false,
  oneMinute: false,
  complete: false,
};

const NOTIF_IDS = {
  halfway: 'timesense.timer.halfway',
  oneMinute: 'timesense.timer.one_minute',
  complete: 'timesense.timer.complete',
} as const;

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    // Widget-only triggers (e.g. the Last Chance mood recompute, lib/widgetSnapshot.ts) exist
    // solely to wake the app and refresh the home screen widget — they must never surface a
    // visible alert to the user.
    if (notification.request.content.data?.widgetSilent === true) {
      return {
        shouldShowBanner: false,
        shouldShowList: false,
        shouldPlaySound: false,
        shouldSetBadge: false,
      };
    }
    return {
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    };
  },
});

/**
 * Absolute fire times (ms) for remaining milestones while the timer is running.
 * Returns null entries when already past or not applicable (e.g. duration < 2 min skips halfway
 * if already past; one_minute skipped when duration ≤ 60s).
 */
export function milestoneFireAtMs(
  snapshot: TimerSnapshot,
  nowMs: number = Date.now(),
): Record<MilestoneKind, number | null> {
  if (snapshot.pauseStartedAtMs != null) {
    return { halfway: null, one_minute: null, complete: null };
  }

  const durationMs = snapshot.durationSeconds * 1000;
  const endAt =
    snapshot.startedAtMs + snapshot.pausedTotalMs + durationMs;
  const halfAt =
    snapshot.startedAtMs + snapshot.pausedTotalMs + durationMs / 2;
  const oneMinAt = endAt - 60_000;

  return {
    halfway: halfAt > nowMs && durationMs >= 120_000 ? halfAt : null,
    one_minute:
      oneMinAt > nowMs && durationMs > 60_000 ? oneMinAt : null,
    complete: endAt > nowMs ? endAt : null,
  };
}

/** Which milestones the derived state has crossed that have not yet been flagged. */
export function milestonesReached(
  derived: TimerDerived,
  flags: MilestoneFireFlags,
  durationSeconds: number,
): MilestoneKind[] {
  const out: MilestoneKind[] = [];
  if (derived.isPaused) return out;

  if (
    !flags.halfway &&
    durationSeconds >= 120 &&
    derived.progress <= 0.5
  ) {
    out.push('halfway');
  }
  if (
    !flags.oneMinute &&
    durationSeconds > 60 &&
    derived.remainingSeconds <= 60 &&
    !derived.isComplete
  ) {
    out.push('one_minute');
  }
  if (!flags.complete && derived.isComplete) {
    out.push('complete');
  }
  return out;
}

export function applyMilestoneFlags(
  flags: MilestoneFireFlags,
  reached: MilestoneKind[],
): MilestoneFireFlags {
  const next = { ...flags };
  for (const kind of reached) {
    if (kind === 'halfway') next.halfway = true;
    if (kind === 'one_minute') next.oneMinute = true;
    if (kind === 'complete') next.complete = true;
  }
  return next;
}

const COPY: Record<MilestoneKind, { title: string; body: string }> = {
  halfway: {
    title: 'About halfway',
    body: 'You are roughly halfway through this timer.',
  },
  one_minute: {
    title: 'One minute left',
    body: 'Just about a minute remaining.',
  },
  complete: {
    title: "Time's up",
    body: 'Your timer finished — nice work.',
  },
};

let permissionAsked = false;

export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (permissionAsked && !current.canAskAgain) return false;
  permissionAsked = true;
  const next = await Notifications.requestPermissionsAsync();
  return next.granted;
}

export async function cancelTimerNotifications(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Promise.all(
    Object.values(NOTIF_IDS).map((id) =>
      Notifications.cancelScheduledNotificationAsync(id).catch(() => {}),
    ),
  );
}

export async function scheduleTimerNotifications(
  snapshot: TimerSnapshot,
  nowMs: number = Date.now(),
): Promise<void> {
  if (Platform.OS === 'web') return;
  const enabled = await getSoundHapticsEnabled();
  if (!enabled) {
    await cancelTimerNotifications();
    return;
  }

  const granted = await ensureNotificationPermission();
  await cancelTimerNotifications();
  if (!granted) return;

  const times = milestoneFireAtMs(snapshot, nowMs);
  const entries: Array<[MilestoneKind, string]> = [
    ['halfway', NOTIF_IDS.halfway],
    ['one_minute', NOTIF_IDS.oneMinute],
    ['complete', NOTIF_IDS.complete],
  ];

  for (const [kind, id] of entries) {
    const at = times[kind];
    if (at == null) continue;
    const seconds = Math.max(1, (at - nowMs) / 1000);
    const copy = COPY[kind];
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: {
        title: copy.title,
        body: copy.body,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
        repeats: false,
      },
    });
  }
}

async function hapticFor(kind: MilestoneKind): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    if (kind === 'halfway') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      );
    }
  } catch {
    // Haptics unavailable on some devices / simulators.
  }
}

/** Fire foreground haptics for newly crossed milestones; returns updated flags. */
export async function pulseMilestoneFeedback(
  snapshot: TimerSnapshot,
  flags: MilestoneFireFlags,
  nowMs: number = Date.now(),
): Promise<MilestoneFireFlags> {
  const enabled = await getSoundHapticsEnabled();
  if (!enabled) return flags;

  const derived = deriveTimer(snapshot, nowMs);
  const reached = milestonesReached(
    derived,
    flags,
    snapshot.durationSeconds,
  );
  if (reached.length === 0) return flags;

  for (const kind of reached) {
    await hapticFor(kind);
  }
  return applyMilestoneFlags(flags, reached);
}

/** Sync scheduled notifications with the current snapshot (or cancel if paused/cleared). */
export async function syncTimerNotifications(
  snapshot: TimerSnapshot | null,
): Promise<void> {
  if (!snapshot || snapshot.pauseStartedAtMs != null) {
    await cancelTimerNotifications();
    return;
  }
  await scheduleTimerNotifications(snapshot);
}
