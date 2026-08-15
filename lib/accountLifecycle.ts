/**
 * Soft-delete + fresh-start account lifecycle.
 * Checked: auth stays in Supabase; profiles.deleted_at gates access; tasks purged only on return.
 */

import type { User } from '@supabase/supabase-js';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { clearSyncState } from '@/lib/syncService';
import { remoteProfileToLocal, type RemoteProfile } from '@/lib/syncMappers';
import { wipeLocalData, wipeLocalUserData } from '@/lib/tasksDb';
import { cancelTimerNotifications } from '@/lib/timerFeedback';

export type AccountPrepareResult =
  | { status: 'active' }
  | { status: 'fresh_start' }
  | { status: 'signed_out_inactive' }
  | { status: 'skipped' };

async function fetchRemoteDeletedAt(
  userId: string,
): Promise<string | null | undefined> {
  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, display_name, username, first_name, last_name, timezone, default_visual_style, streak_count, freezes_available, last_active_date, deleted_at',
    )
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return remoteProfileToLocal(data as RemoteProfile).deletedAt;
}

/** Soft-delete cloud profile, wipe this device, cancel timer alerts. Caller signs out. */
export async function softDeleteOwnAccount(): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    return { ok: false, error: 'Supabase is not configured.' };
  }

  const { error } = await supabase.rpc('soft_delete_own_account');
  if (error) {
    return {
      ok: false,
      error: `${error.message} — apply migration 006_soft_delete_account.sql on Supabase.`,
    };
  }

  await wipeLocalData();
  await cancelTimerNotifications();
  return { ok: true };
}

/**
 * Before sync after auth:
 * - SIGNED_IN + inactive → fresh_start RPC (purge cloud timers), clear local user rows, continue
 * - INITIAL_SESSION + inactive → sign out so retained cloud data stays until intentional return
 */
export async function prepareAccountAfterAuth(
  user: User,
  opts: { freshStartIfInactive: boolean },
): Promise<AccountPrepareResult> {
  if (!isSupabaseConfigured) return { status: 'skipped' };

  const deletedAt = await fetchRemoteDeletedAt(user.id);
  if (!deletedAt) return { status: 'active' };

  if (!opts.freshStartIfInactive) {
    await wipeLocalData();
    await cancelTimerNotifications();
    await supabase.auth.signOut();
    return { status: 'signed_out_inactive' };
  }

  const { error } = await supabase.rpc('fresh_start_own_account');
  if (error) {
    throw new Error(
      `${error.message} — apply migration 006_soft_delete_account.sql on Supabase.`,
    );
  }

  await clearSyncState();
  await wipeLocalUserData(user.id);
  await cancelTimerNotifications();
  return { status: 'fresh_start' };
}
