/**
 * Local-first sync: SQLite is source of truth; Supabase is backup.
 * Delta pull via updated_at watermark. No Realtime. See BUILD_SPEC.md §4.4.
 *
 * Checked: no existing sync module; uses @supabase/supabase-js already installed.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '@supabase/supabase-js';
import * as Sentry from '@sentry/react-native';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import {
  interruptionToRemotePayload,
  profileToRemotePayload,
  remoteInterruptionToLocal,
  remoteProfileToLocal,
  remoteRoutineToLocal,
  remoteTaskToLocal,
  routineToRemotePayload,
  taskToRemotePayload,
  type RemoteInterruption,
  type RemoteProfile,
  type RemoteRoutine,
  type RemoteTask,
} from '@/lib/syncMappers';
import {
  displayNameFromParts,
  namesFromUserMetadata,
} from '@/lib/userNames';
import {
  claimGuestTasks,
  getLocalProfile,
  getTaskById,
  initTasksDb,
  listUnsyncedInterruptions,
  listUnsyncedTasks,
  markInterruptionsSynced,
  markTasksSynced,
  upsertLocalInterruption,
  upsertLocalProfile,
  upsertLocalTask,
} from '@/lib/tasksDb';
import {
  getRoutineById,
  listUnsyncedRoutines,
  markRoutinesSynced,
  upsertLocalRoutine,
} from '@/lib/routinesDb';
import type { Profile } from '@/types/task';

const TASKS_WATERMARK_KEY = 'timesense.sync.tasks_watermark';
const ROUTINES_WATERMARK_KEY = 'timesense.sync.routines_watermark';
const LAST_SYNC_AT_KEY = 'timesense.sync.last_at';

export type SyncResult = {
  ok: boolean;
  pushed: number;
  pulled: number;
  error?: string;
};

let inFlight: Promise<SyncResult> | null = null;

/**
 * Postgrest/Supabase errors are Error subclasses, but some rejections (native SQLite
 * exceptions, RN's network layer on certain Android versions) aren't real Error instances —
 * those used to collapse to a generic "Sync failed" with no diagnostic info. Surface whatever
 * shape shows up instead of guessing.
 */
function describeSyncError(e: unknown): string {
  if (e instanceof Error) {
    const withCode = e as Error & { code?: string; hint?: string; details?: string };
    const parts = [e.message || e.name || 'Unknown error'];
    if (withCode.code) parts.push(`code: ${withCode.code}`);
    if (withCode.hint) parts.push(`hint: ${withCode.hint}`);
    return parts.join(' — ');
  }
  if (typeof e === 'string') return e;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

async function getWatermark(): Promise<string> {
  return (
    (await AsyncStorage.getItem(TASKS_WATERMARK_KEY)) ??
    '1970-01-01T00:00:00.000Z'
  );
}

async function setWatermark(iso: string): Promise<void> {
  await AsyncStorage.setItem(TASKS_WATERMARK_KEY, iso);
}

async function getRoutinesWatermark(): Promise<string> {
  return (
    (await AsyncStorage.getItem(ROUTINES_WATERMARK_KEY)) ??
    '1970-01-01T00:00:00.000Z'
  );
}

async function setRoutinesWatermark(iso: string): Promise<void> {
  await AsyncStorage.setItem(ROUTINES_WATERMARK_KEY, iso);
}

export async function getLastSyncedAt(): Promise<number | null> {
  const raw = await AsyncStorage.getItem(LAST_SYNC_AT_KEY);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** Clear sync watermarks (call after local wipe / account delete). */
export async function clearSyncState(): Promise<void> {
  await AsyncStorage.multiRemove([
    TASKS_WATERMARK_KEY,
    ROUTINES_WATERMARK_KEY,
    LAST_SYNC_AT_KEY,
  ]);
}

function displayNameFromUser(user: User): string | null {
  const names = namesFromUserMetadata(user.user_metadata);
  if (names.displayName) return names.displayName;
  if (user.email) return user.email.split('@')[0] ?? user.email;
  return null;
}

function deviceTimezone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

/**
 * Ensure a profiles row exists remotely (trigger may be missing / user predated it)
 * and push display_name / timezone from auth + local cache.
 */
async function ensureAndPushProfile(user: User): Promise<number> {
  const userId = user.id;
  const remote = await supabase
    .from('profiles')
    .select(
      'id, display_name, username, first_name, last_name, timezone, default_visual_style, streak_count, freezes_available, last_active_date, deleted_at',
    )
    .eq('id', userId)
    .maybeSingle();

  if (remote.error) throw remote.error;

  const local = await getLocalProfile(userId);
  const fromRemote = remote.data
    ? remoteProfileToLocal(remote.data as RemoteProfile)
    : null;

  // Inactive accounts must not sync; auth layer handles fresh-start / sign-out.
  if (fromRemote?.deletedAt) {
    throw new Error('Account is inactive');
  }

  const fromAuth = namesFromUserMetadata(user.user_metadata);

  // Prefer whichever side has the newer last_active_date for streak fields so a
  // sync never clobbers an on-device streak update with a stale remote row.
  const localActive = local?.lastActiveDate ?? '';
  const remoteActive = fromRemote?.lastActiveDate ?? '';
  const preferLocalStreak =
    !fromRemote ||
    (local != null && localActive >= remoteActive && localActive !== '');

  const streakSource = preferLocalStreak && local ? local : fromRemote ?? local;

  const firstName =
    local?.firstName ?? fromRemote?.firstName ?? fromAuth.firstName;
  const lastName =
    local?.lastName ?? fromRemote?.lastName ?? fromAuth.lastName;
  const username =
    local?.username ?? fromRemote?.username ?? fromAuth.username;
  const displayName =
    local?.displayName ??
    fromRemote?.displayName ??
    displayNameFromParts(firstName, lastName, displayNameFromUser(user));

  const merged: Profile = {
    id: userId,
    displayName,
    username,
    firstName,
    lastName,
    timezone: local?.timezone ?? fromRemote?.timezone ?? deviceTimezone(),
    defaultVisualStyle:
      local?.defaultVisualStyle ?? fromRemote?.defaultVisualStyle ?? 'pizza',
    streakCount: streakSource?.streakCount ?? 0,
    freezesAvailable: streakSource?.freezesAvailable ?? 2,
    lastActiveDate: streakSource?.lastActiveDate ?? null,
    deletedAt: null,
    subscriptionTier:
      fromRemote?.subscriptionTier ?? local?.subscriptionTier ?? 'standard',
    subscriptionExpiresAt:
      fromRemote?.subscriptionExpiresAt ?? local?.subscriptionExpiresAt ?? null,
  };

  await upsertLocalProfile(merged);

  const { error } = await supabase
    .from('profiles')
    .upsert(profileToRemotePayload(merged), { onConflict: 'id' });
  if (error) throw error;

  return 1;
}

async function pushTasks(userId: string): Promise<number> {
  const unsynced = await listUnsyncedTasks();
  const toPush = unsynced.filter((t) => t.userId === userId || !t.userId);
  if (toPush.length === 0) return 0;

  const payload = toPush.map((t) => taskToRemotePayload({ ...t, userId }, userId));
  const { error } = await supabase.from('tasks').upsert(payload, { onConflict: 'id' });
  if (error) throw error;

  await markTasksSynced(toPush.map((t) => t.id));
  return toPush.length;
}

async function pushInterruptions(): Promise<number> {
  const unsynced = await listUnsyncedInterruptions();
  if (unsynced.length === 0) return 0;

  const payload = unsynced.map(interruptionToRemotePayload);
  const { error } = await supabase
    .from('interruptions')
    .upsert(payload, { onConflict: 'id' });
  if (error) throw error;

  await markInterruptionsSynced(unsynced.map((r) => r.id));
  return unsynced.length;
}

async function pullTasks(userId: string): Promise<{
  count: number;
  pulledIds: string[];
  maxUpdatedAt: string | null;
}> {
  const watermark = await getWatermark();
  const { data, error } = await supabase
    .from('tasks')
    .select(
      'id, user_id, name, description, category, predicted_seconds, actual_seconds, visual_style, started_at, ended_at, mood_tag, created_at, updated_at, routine_id',
    )
    .eq('user_id', userId)
    .gt('updated_at', watermark)
    .order('updated_at', { ascending: true });

  if (error) throw error;
  const rows = (data ?? []) as RemoteTask[];
  let maxUpdatedAt: string | null = null;
  const pulledIds: string[] = [];

  for (const remote of rows) {
    const incoming = remoteTaskToLocal(remote);
    const local = await getTaskById(incoming.id);
    if (local && !local.synced && local.updatedAt > incoming.updatedAt) {
      continue;
    }
    await upsertLocalTask(incoming);
    pulledIds.push(incoming.id);
    if (!maxUpdatedAt || remote.updated_at > maxUpdatedAt) {
      maxUpdatedAt = remote.updated_at;
    }
  }

  return { count: pulledIds.length, pulledIds, maxUpdatedAt };
}

async function pullInterruptionsForTasks(taskIds: string[]): Promise<number> {
  if (taskIds.length === 0) return 0;

  const { data, error } = await supabase
    .from('interruptions')
    .select('id, task_id, started_at, ended_at')
    .in('task_id', taskIds);

  if (error) throw error;
  const rows = (data ?? []) as RemoteInterruption[];
  for (const row of rows) {
    await upsertLocalInterruption(remoteInterruptionToLocal(row));
  }
  return rows.length;
}

async function pushRoutines(userId: string): Promise<number> {
  const unsynced = await listUnsyncedRoutines();
  const toPush = unsynced.filter((r) => r.userId === userId || !r.userId);
  if (toPush.length === 0) return 0;

  const payload = toPush.map((r) =>
    routineToRemotePayload({ ...r, userId }, userId),
  );
  const { error } = await supabase
    .from('routines')
    .upsert(payload, { onConflict: 'id' });
  if (error) throw error;

  await markRoutinesSynced(toPush.map((r) => r.id));
  return toPush.length;
}

async function pullRoutines(userId: string): Promise<number> {
  const watermark = await getRoutinesWatermark();
  const { data, error } = await supabase
    .from('routines')
    .select(
      'id, user_id, name, category, predicted_seconds, visual_style, recurrence_days, reminder_hour, reminder_minute, start_date, end_date, active, created_at, updated_at, deleted_at',
    )
    .eq('user_id', userId)
    .gt('updated_at', watermark)
    .order('updated_at', { ascending: true });

  if (error) throw error;
  const rows = (data ?? []) as RemoteRoutine[];
  let maxUpdatedAt: string | null = null;

  for (const remote of rows) {
    const incoming = remoteRoutineToLocal(remote);
    const local = await getRoutineById(incoming.id);
    if (local && !local.synced && local.updatedAt > incoming.updatedAt) {
      continue;
    }
    await upsertLocalRoutine(incoming);
    if (incoming.deletedAt && (!local || !local.deletedAt)) {
      const { cancelRoutineNotifications } = await import('@/lib/routineNotifications');
      await cancelRoutineNotifications(incoming.id).catch(() => {});
    }
    if (!maxUpdatedAt || remote.updated_at > maxUpdatedAt) {
      maxUpdatedAt = remote.updated_at;
    }
  }

  if (maxUpdatedAt) {
    await setRoutinesWatermark(maxUpdatedAt);
  }
  return rows.length;
}

/**
 * Push unsynced local rows, then delta-pull tasks (and related interruptions) + profile.
 * No-ops for guests / unconfigured Supabase. Dedupes concurrent calls.
 */
export async function syncNow(): Promise<SyncResult> {
  if (inFlight) return inFlight;

  inFlight = (async (): Promise<SyncResult> => {
    if (!isSupabaseConfigured) {
      return { ok: true, pushed: 0, pulled: 0 };
    }

    await initTasksDb();

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      return { ok: true, pushed: 0, pulled: 0 };
    }

    try {
      await claimGuestTasks(user.id);

      const pushedProfile = await ensureAndPushProfile(user);
      const pushedRoutines = await pushRoutines(user.id);
      const pushedTasks = await pushTasks(user.id);
      let pushedInterruptions = 0;
      try {
        pushedInterruptions = await pushInterruptions();
      } catch {
        // Parent task may not be on server yet; retry next sync.
      }

      const pulledRoutines = await pullRoutines(user.id);
      const { count: pulledTasks, pulledIds, maxUpdatedAt } = await pullTasks(
        user.id,
      );
      if (maxUpdatedAt) {
        await setWatermark(maxUpdatedAt);
      }

      let pulledInterruptions = 0;
      try {
        pulledInterruptions = await pullInterruptionsForTasks(pulledIds);
      } catch {
        // optional; ignore
      }

      await AsyncStorage.setItem(LAST_SYNC_AT_KEY, String(Date.now()));

      return {
        ok: true,
        pushed: pushedProfile + pushedRoutines + pushedTasks + pushedInterruptions,
        pulled: pulledRoutines + pulledTasks + pulledInterruptions,
      };
    } catch (e) {
      const message = describeSyncError(e);
      console.error('[sync] failed:', message, e);
      Sentry.captureException(e instanceof Error ? e : new Error(message), {
        tags: { context: 'syncNow' },
      });
      return { ok: false, pushed: 0, pulled: 0, error: message };
    }
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}
