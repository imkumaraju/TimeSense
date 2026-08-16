import type { Profile } from '@/types/task';

/** Single source of truth for "is this user on TimeSense Plus." */
export function isPlus(profile: Profile | null | undefined): boolean {
  if (!profile) return false;
  if (profile.subscriptionTier !== 'plus') return false;
  if (profile.subscriptionExpiresAt == null) return true;
  return new Date(profile.subscriptionExpiresAt).getTime() > Date.now();
}
