/**
 * Interstitial ad for TimeSense's free (standard) tier — shown once per "Finish" tap, right
 * before the task-complete/save screen. TimeSense Plus subscribers never see this (the ad is
 * the *only* difference between tiers now — see lib/entitlements.ts's isPlus() and
 * docs/concepts/feature-subscription-ads.md).
 *
 * GDPR/UK/regulated-region consent uses Google's UMP via AdsConsent on the already-installed
 * `react-native-google-mobile-ads` package (no extra CMP). The form is gathered on cold start
 * so it never sits on the Finish path. Ads are requested only when `canRequestAds` is true.
 *
 * Everything from `react-native-google-mobile-ads` is dynamically imported so this module is
 * safe to call from any build, including Expo Go (no native module present there) — it just
 * silently resolves with no ad shown in that case, same pattern as lib/widgetSnapshot.ts's
 * optional `react-native-android-widget` import.
 */
import { Platform } from 'react-native';

let mobileAdsInitialized = false;
let lastConsent: AdsConsentSnapshot | null = null;
let gatherInFlight: Promise<AdsConsentSnapshot> | null = null;

function resolveAdUnitId(envVar: string | undefined, testId: string): string {
  return envVar && envVar.length > 0 ? envVar : testId;
}

/** Ad SDK/network round-trip should never block the user from finishing their timer. */
const LOAD_TIMEOUT_MS = 4000;

export type AdsConsentSnapshot = {
  canRequestAds: boolean;
  isPrivacyOptionsRequired: boolean;
};

const CONSENT_UNAVAILABLE: AdsConsentSnapshot = {
  canRequestAds: false,
  isPrivacyOptionsRequired: false,
};

type ConsentInfoLike = {
  canRequestAds: boolean;
  privacyOptionsRequirementStatus: string;
};

/** Pure mapping used by tests — keep in lockstep with invertase AdsConsentInfo. */
export function snapshotFromConsentInfo(info: ConsentInfoLike): AdsConsentSnapshot {
  return {
    canRequestAds: info.canRequestAds,
    isPrivacyOptionsRequired: info.privacyOptionsRequirementStatus === 'REQUIRED',
  };
}

/**
 * Whether this session is even eligible to request an interstitial. Consent is a separate
 * gate (`canRequestAds`) — Plus / web never load the ad SDK.
 */
export function interstitialIsDue(opts: {
  isPlus: boolean;
  platform: string;
  canRequestAds: boolean;
}): boolean {
  if (opts.isPlus || opts.platform === 'web') return false;
  return opts.canRequestAds;
}

function consentDebugOptions(mod: typeof import('react-native-google-mobile-ads')) {
  if (process.env.EXPO_PUBLIC_ADMOB_DEBUG_EEA !== '1') return undefined;
  const testDevice = process.env.EXPO_PUBLIC_ADMOB_TEST_DEVICE_ID;
  return {
    debugGeography: mod.AdsConsentDebugGeography.EEA,
    ...(testDevice && testDevice.length > 0
      ? { testDeviceIdentifiers: [testDevice] }
      : {}),
  };
}

async function loadAdsModule(): Promise<typeof import('react-native-google-mobile-ads') | null> {
  if (Platform.OS === 'web') return null;
  try {
    return await import('react-native-google-mobile-ads');
  } catch {
    return null;
  }
}

async function initializeMobileAds(
  mod: typeof import('react-native-google-mobile-ads'),
): Promise<void> {
  if (mobileAdsInitialized) return;
  mobileAdsInitialized = true;
  try {
    await mod.default().initialize();
  } catch {
    mobileAdsInitialized = false;
  }
}

/**
 * Request UMP info and present Google's consent form if this region requires it. No-ops
 * outside regulated regions and when the native module isn't linked. Call on cold start
 * (app/_layout.tsx) so EEA/UK users see the form before they ever tap Finish.
 */
export async function gatherAdsConsent(): Promise<AdsConsentSnapshot> {
  if (gatherInFlight) return gatherInFlight;
  gatherInFlight = (async () => {
    const mod = await loadAdsModule();
    if (!mod) {
      lastConsent = CONSENT_UNAVAILABLE;
      return lastConsent;
    }
    let snap: AdsConsentSnapshot;
    try {
      const info = await mod.AdsConsent.gatherConsent(consentDebugOptions(mod));
      snap = snapshotFromConsentInfo(info);
    } catch {
      try {
        const info = await mod.AdsConsent.getConsentInfo();
        snap = snapshotFromConsentInfo(info);
      } catch {
        // UMP failed outright (no form configured, offline, etc.). Don't permanently
        // block ads worldwide — the ad request itself still no-ops on any SDK error.
        snap = { canRequestAds: true, isPrivacyOptionsRequired: false };
      }
    }
    lastConsent = snap;
    if (snap.canRequestAds) {
      await initializeMobileAds(mod);
    }
    return snap;
  })();
  try {
    return await gatherInFlight;
  } finally {
    gatherInFlight = null;
  }
}

/** Last known UMP snapshot without presenting a form. Safe on Settings focus. */
export async function getAdsConsentSnapshot(): Promise<AdsConsentSnapshot> {
  if (lastConsent) return lastConsent;
  const mod = await loadAdsModule();
  if (!mod) {
    lastConsent = CONSENT_UNAVAILABLE;
    return lastConsent;
  }
  try {
    const info = await mod.AdsConsent.getConsentInfo();
    lastConsent = snapshotFromConsentInfo(info);
    return lastConsent;
  } catch {
    lastConsent = lastConsent ?? CONSENT_UNAVAILABLE;
    return lastConsent;
  }
}

/** Google-required re-entry to change ad choices when privacy options are required (EEA/UK). */
export async function showAdsPrivacyOptions(): Promise<AdsConsentSnapshot> {
  const mod = await loadAdsModule();
  if (!mod) return lastConsent ?? CONSENT_UNAVAILABLE;
  try {
    const info = await mod.AdsConsent.showPrivacyOptionsForm();
    lastConsent = snapshotFromConsentInfo(info);
    return lastConsent;
  } catch {
    return lastConsent ?? CONSENT_UNAVAILABLE;
  }
}

/**
 * Shows a full-screen interstitial and resolves once it's closed. Resolves immediately with
 * no ad shown for Plus subscribers, on web (the ads SDK is native-only), if the SDK isn't
 * linked (e.g. Expo Go), if UMP has not allowed ads yet, or if the ad fails to load within
 * LOAD_TIMEOUT_MS.
 */
export async function showInterstitialIfDue(isPlus: boolean): Promise<void> {
  if (isPlus || Platform.OS === 'web') return;

  try {
    const mobileAdsModule = await loadAdsModule();
    if (!mobileAdsModule) return;

    const consent = lastConsent ?? (await gatherAdsConsent());
    if (
      !interstitialIsDue({
        isPlus,
        platform: Platform.OS,
        canRequestAds: consent.canRequestAds,
      })
    ) {
      return;
    }

    const { AdEventType, InterstitialAd, TestIds } = mobileAdsModule;
    await initializeMobileAds(mobileAdsModule);

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
