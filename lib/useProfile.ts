import { useCallback, useEffect, useState } from 'react';

import { isPlus } from '@/lib/entitlements';
import { getStreakProfile } from '@/lib/streakService';
import type { Profile } from '@/types/task';
import { useAuthStore } from '@/stores/authStore';

/** Loads the current local profile and exposes entitlement status. Call refresh()
 *  after a purchase, restore, or ad-earned freeze so screens update immediately. */
export function useProfile() {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const refresh = useCallback(async () => {
    const next = await getStreakProfile(userId);
    setProfile(next);
    return next;
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { profile, isPlus: isPlus(profile), refresh };
}
