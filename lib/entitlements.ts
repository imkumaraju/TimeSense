import type { Profile } from '@/types/task';

/**
 * Flip to `true` once real Play Store subscription products exist and are linked in
 * RevenueCat (blocked behind BillDesk merchant verification, see docs/TODO.md item #1/#2).
 * While `false`, the app ships as free-only (ads-on-finish for everyone) and hides the
 * "Upgrade to Plus" entry point in Settings, rather than offering a purchase flow that can't
 * actually process a payment — see docs/TODO.md item #16.
 */
export const PAYMENTS_ENABLED = false;

/** Single source of truth for "is this user on TimeSense Plus." */
export function isPlus(profile: Profile | null | undefined): boolean {
  if (!profile) return false;
  if (profile.subscriptionTier !== 'plus') return false;
  if (profile.subscriptionExpiresAt == null) return true;
  return new Date(profile.subscriptionExpiresAt).getTime() > Date.now();
}
