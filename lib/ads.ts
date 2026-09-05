/**
 * Interstitial ad for TimeSense's free (standard) tier — shown once per "Finish" tap, right
 * before the task-complete/save screen. TimeSense Plus subscribers never see this (the ad is
 * the *only* difference between tiers now — see lib/entitlements.ts's isPlus() and
 * docs/concepts/feature-subscription-ads.md).
 *
 * Everything from `react-native-google-mobile-ads` is dynamically imported so this module is
 * safe to call from any build, including Expo Go (no native module present there) — it just
 * silently resolves with no ad shown in that case, same pattern as lib/widgetSnapshot.ts's
 * optional `react-native-android-widget` import.
 */
import { Platform } from 'react-native';

let mobileAdsInitialized = false;

function resolveAdUnitId(envVar: string | undefined, testId: string): string {
  return envVar && envVar.length > 0 ? envVar : testId;
}

/** Ad SDK/network round-trip should never block the user from finishing their timer. */
const LOAD_TIMEOUT_MS = 4000;

/**
 * Shows a full-screen interstitial and resolves once it's closed. Resolves immediately with
 * no ad shown for Plus subscribers, on web (the ads SDK is native-only), if the SDK isn't
 * linked (e.g. Expo Go), or if the ad fails to load within LOAD_TIMEOUT_MS.
 */
export async function showInterstitialIfDue(isPlus: boolean): Promise<void> {
  if (isPlus || Platform.OS === 'web') return;

  try {
    const mobileAdsModule = await import('react-native-google-mobile-ads');
    const { AdEventType, InterstitialAd, TestIds } = mobileAdsModule;

    if (!mobileAdsInitialized) {
      mobileAdsInitialized = true;
      await mobileAdsModule.default().initialize();
    }

    const adUnitId =
      Platform.OS === 'ios'
        ? resolveAdUnitId(process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS_ID, TestIds.INTERSTITIAL)
        : resolveAdUnitId(process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID_ID, TestIds.INTERSTITIAL);

    const ad = InterstitialAd.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: true,
    });

    await new Promise<void>((resolve) => {
      let settled = false;
      const unsubscribers: Array<() => void> = [];
      const finish = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        unsubscribers.forEach((unsub) => unsub());
        resolve();
      };
      const timer = setTimeout(finish, LOAD_TIMEOUT_MS);

      unsubscribers.push(
        ad.addAdEventListener(AdEventType.LOADED, () => {
          ad.show().catch(finish);
        }),
      );
      unsubscribers.push(ad.addAdEventListener(AdEventType.CLOSED, finish));
      unsubscribers.push(ad.addAdEventListener(AdEventType.ERROR, finish));

      ad.load();
    });
  } catch {
    // Ad SDK not available in this build, no fill, or any other failure — proceed silently.
  }
}
