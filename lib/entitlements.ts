import type { Profile } from '@/types/task';

/**
 * Flip to `true` once real Play Store subscription products exist and are linked in
 * RevenueCat (blocked behind BillDesk merchant verification, see docs/TODO.md item #1/#2).
 * While `false`, the app ships as free-only (ads-on-finish for everyone). Settings shows
 * TimeSense Plus as "Coming soon" and the paywall is info-only — no purchase CTA — rather
 * than offering a flow that can't process a payment. BillDesk needs a live listing before
 * it will verify the merchant account, so Plus stays announced-but-unpurchasable until
 * that clears — see docs/TODO.md item #16.
 */
export const PAYMENTS_ENABLED = false;

/** Single source of truth for "is this user on TimeSense Plus." */
export function isPlus(profile: Profile | null | undefined): boolean {
  if (!profile) return false;
  if (profile.subscriptionTier !== 'plus') return false;
  if (profile.subscriptionExpiresAt == null) return true;
  return new Date(profile.subscriptionExpiresAt).getTime() > Date.now();
}
