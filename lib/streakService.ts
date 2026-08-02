/**
 * On-device streak persistence. Mutates local profiles only on task complete.
 * Checked: profiles already have streak fields in tasksDb; no new table needed.
 */
import {
  applyStreakOnTaskComplete,
  localDateString,
  MAX_FREEZES,
  type StreakApplyResult,
} from '@/lib/streakLogic';
import { getDefaultVisualStyle } from '@/lib/settings';
import { getLocalProfile, upsertLocalProfile } from '@/lib/tasksDb';
import type { Profile } from '@/types/task';

/** Local-only profile id while in guest / offline mode. */
export const GUEST_PROFILE_ID = 'local-guest';

export function profileIdForAuth(userId: string | null | undefined): string {
  return userId ?? GUEST_PROFILE_ID;
}

async function ensureLocalProfile(id: string): Promise<Profile> {
  const existing = await getLocalProfile(id);
  if (existing) return existing;

  const profile: Profile = {
    id,
    displayName: id === GUEST_PROFILE_ID ? 'Guest' : null,
    username: null,
    firstName: null,
    lastName: null,
    timezone: null,
    defaultVisualStyle: await getDefaultVisualStyle(),
    streakCount: 0,
    freezesAvailable: MAX_FREEZES,
    lastActiveDate: null,
  };
  await upsertLocalProfile(profile);
  return profile;
}

/**
 * Record that a task was saved today. Call once per Task Complete → Save.
 * Idempotent for further saves the same calendar day.
 */
export async function recordStreakOnTaskComplete(
  userId: string | null | undefined,
  now: Date = new Date(),
): Promise<StreakApplyResult & { profile: Profile }> {
  const id = profileIdForAuth(userId);
  const profile = await ensureLocalProfile(id);
  const today = localDateString(now);
  const result = applyStreakOnTaskComplete(
    {
      streakCount: profile.streakCount,
      freezesAvailable: profile.freezesAvailable,
      lastActiveDate: profile.lastActiveDate,
    },
    today,
  );

  if (!result.changed) {
    return { ...result, profile };
  }

  const updated: Profile = {
    ...profile,
    streakCount: result.streakCount,
    freezesAvailable: result.freezesAvailable,
    lastActiveDate: result.lastActiveDate,
  };
  await upsertLocalProfile(updated);
  return { ...result, profile: updated };
}

export async function getStreakProfile(
  userId: string | null | undefined,
): Promise<Profile | null> {
  return getLocalProfile(profileIdForAuth(userId));
}
