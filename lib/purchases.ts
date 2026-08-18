/**
 * RevenueCat integration. RevenueCat is the source of truth for subscription
 * entitlement; this module mirrors the "TimeSense Pro" entitlement into the
 * local profile (subscriptionTier / subscriptionExpiresAt) so isPlus() checks
 * work offline without a network call. Parallel role to lib/streakService.ts.
 */
import { Platform } from 'react-native';
import Purchases, {
  type CustomerInfo,
  type PurchasesOffering,
} from 'react-native-purchases';

import { profileIdForAuth } from '@/lib/streakService';
import { getLocalProfile, upsertLocalProfile } from '@/lib/tasksDb';
import { useAuthStore } from '@/stores/authStore';

/** Must match the entitlement identifier configured in the RevenueCat dashboard. */
const ENTITLEMENT_ID = 'TimeSense Pro';

const REVENUECAT_API_KEY =
  Platform.OS === 'ios'
    ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY
    : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;

let configured = false;

async function mirrorEntitlement(info: CustomerInfo): Promise<void> {
  const userId = useAuthStore.getState().user?.id ?? null;
  const id = profileIdForAuth(userId);
  const profile = await getLocalProfile(id);
  if (!profile) return;

  const entitlement = info.entitlements.active[ENTITLEMENT_ID];
  const subscriptionTier = entitlement ? 'plus' : 'standard';
  const subscriptionExpiresAt = entitlement?.expirationDate ?? null;

  if (
    profile.subscriptionTier === subscriptionTier &&
    profile.subscriptionExpiresAt === subscriptionExpiresAt
  ) {
    return;
  }

  await upsertLocalProfile({ ...profile, subscriptionTier, subscriptionExpiresAt });
}

/**
 * Configures the RevenueCat SDK once and keeps the local profile mirror in
 * sync with entitlement changes. Safe to call more than once (no-ops after
 * the first successful call). No-ops entirely if no API key is set (e.g.
 * local dev without RevenueCat configured yet).
 */
export function initPurchases(): void {
  if (!REVENUECAT_API_KEY || configured) return;
  configured = true;
  Purchases.configure({ apiKey: REVENUECAT_API_KEY });
  Purchases.addCustomerInfoUpdateListener((info) => {
    void mirrorEntitlement(info);
  });
}

/**
 * Call on sign-in/sign-out so RevenueCat keys entitlements to the Supabase
 * user id (cross-device sync) instead of an anonymous per-install id.
 */
export function syncPurchasesIdentity(userId: string | null): void {
  if (!REVENUECAT_API_KEY || !configured) return;
  if (userId) {
    void Purchases.logIn(userId).then(({ customerInfo }) => mirrorEntitlement(customerInfo));
  } else {
    void Purchases.logOut().then((customerInfo) => mirrorEntitlement(customerInfo));
  }
}

/** Returns null (rather than throwing) if no offering is configured yet in the
 *  RevenueCat dashboard — the paywall falls back to static pricing text. */
export async function getCurrentOffering(): Promise<PurchasesOffering | null> {
  if (!REVENUECAT_API_KEY) return null;
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch {
    return null;
  }
}

export async function purchasePlus(plan: 'monthly' | 'annual'): Promise<void> {
  if (!REVENUECAT_API_KEY) {
    throw new Error('Purchases are not configured on this build.');
  }
  const current = await getCurrentOffering();
  const pkg = plan === 'monthly' ? current?.monthly : current?.annual;
  if (!pkg) {
    throw new Error('No matching subscription package is available.');
  }
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  await mirrorEntitlement(customerInfo);
}

export async function restorePurchases(): Promise<void> {
  if (!REVENUECAT_API_KEY) {
    throw new Error('Purchases are not configured on this build.');
  }
  const customerInfo = await Purchases.restorePurchases();
  await mirrorEntitlement(customerInfo);
}

/** Opens the platform's native subscription-management surface (App Store /
 *  Play Store). Used by the Settings "Manage subscription" row. */
export async function showManageSubscriptions(): Promise<void> {
  if (!REVENUECAT_API_KEY) {
    throw new Error('Purchases are not configured on this build.');
  }
  await Purchases.showManageSubscriptions();
}
