# Feature: Single-Tier Subscription, Ads-on-Finish

## Summary
TimeSense has exactly one paid tier — **TimeSense Plus** — sold as two packages
(**$6.99/month** or **$59.99/year**, the original pricing — briefly changed to $10/$100 on
2026-09-05 and reverted back the next day). The **only** difference between Plus and
the free (standard) tier is ads: **standard-tier users see a full-screen interstitial ad
immediately after tapping "Finish" on an active timer, before the task-complete/save screen
appears; Plus users never see this ad.** This supersedes the prior paywall's three-perk pitch
(no ads, all timer styles, priority sync) — all timer styles are now free for everyone, and
sync behavior was already identical across tiers, so ads-on-finish is the entire value
proposition now.

## Why This Change
The previous perk list oversold what was actually different code-wise: sync was never
tier-gated, and gating one SVG timer style (Cat Loaf) behind Plus was a minor, easily-missed
incentive. Collapsing to a single, viscerally obvious differentiator — an interruption every
time you finish a timer, or not — is a clearer pitch and a much simpler entitlement model to
reason about and test.

## Entitlement Model (unchanged mechanism, narrower meaning)
No new entitlement plumbing was needed — `lib/entitlements.ts`'s `isPlus(profile)` and
`lib/purchases.ts`'s RevenueCat integration (`'TimeSense Pro'` entitlement, `monthly`/`annual`
packages from the current offering) are exactly what already existed. What changed is what
`isPlus()` gates:
- **Before:** `STYLE_OPTIONS[].premium` (only `cat: true`) gated style selection in
  `app/timer/new.tsx` / `app/(tabs)/settings.tsx`.
- **Now:** `STYLE_OPTIONS[].premium` is `false` for every style (`constants/theme.ts`) — the
  flag stays in the type shape in case a future style is deliberately Plus-only again, but
  nothing uses it today. `isPlus()`'s only live call site that changes behavior is the
  ads-on-finish check in `app/timer/active.tsx`.

## Ads-on-Finish Flow
```
User taps "Finish" (app/timer/active.tsx)
  → onFinish() — button shows "Loading…", disabled
    → showInterstitialIfDue(isPlus)   (lib/ads.ts)
        Plus user  → resolves immediately, no ad
        Standard   → UMP `canRequestAds`? if no, skip ad (Finish still saves)
                     else loads + shows a full-screen interstitial, resolves on close
                     (or resolves anyway after a 4s load timeout / any SDK error —
                     an ad network hiccup must never block finishing a timer)
  → router.replace('/timer/complete')  (unchanged — the save/review screen)
```
- The ad is requested **fresh on every Finish tap** — no caching/preloading across sessions in
  this pass. `InterstitialAd.createForAdRequest()` is called each time.
- `isPlus` is read via `useProfile()` in `active.tsx`, same hook already used elsewhere for
  entitlement checks.
- Non-blocking-on-failure is a hard requirement: a user must always be able to reach the
  complete screen, ad or no ad. `lib/ads.ts` swallows every failure mode (no SDK linked, no
  fill, network error, timeout) and just resolves.

## Ad SDK: Google AdMob (`react-native-google-mobile-ads`)
- Chosen because it's the standard, actively-maintained, Expo-config-plugin-compatible ad SDK
  for React Native — no other ad SDK existed in the app before this (confirmed via full-repo
  search prior to this change; `docs/PLAY_STORE_LISTING.md` previously declared "No ad SDKs").
- Everything from the package is **dynamically imported** in `lib/ads.ts` (`await
  import('react-native-google-mobile-ads')`), the same pattern `lib/widgetSnapshot.ts` uses for
  `react-native-android-widget` — this keeps the module safe to call from Expo Go or any build
  where the native module isn't linked; it just silently shows no ad.
- **Config plugin** registered in `app.config.js` with `androidAppId`/`iosAppId`. Ships with
  **Google's public test AdMob App IDs by default** (`ca-app-pub-3940256099942544~...`) — these
  only ever serve Google's test creatives, so it's safe to leave as the default indefinitely
  until a real AdMob account exists. Override via `ADMOB_ANDROID_APP_ID` / `ADMOB_IOS_APP_ID`
  (plain env vars, read at config/build time — not `EXPO_PUBLIC_*`, since the App ID is baked
  into native manifest config, not read at JS runtime).
- **Ad unit ID** (the specific interstitial placement, distinct from the app-level App ID)
  resolves in `lib/ads.ts` from `EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID_ID` /
  `EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS_ID`, falling back to `TestIds.INTERSTITIAL` (the
  library's own test constant) if unset.
- **This is a new native dependency** — same build-impact category as `expo-video` /
  `expo-linear-gradient` / `expo-image` before it: needs a fresh EAS build to take effect, not
  just a JS-only redeploy.
- **Pinned to `react-native-google-mobile-ads@16.0.0`, not the latest 16.5.0** (2026-09-05):
  the first `sys` build with 16.5.0 failed —
  `:react-native-google-mobile-ads:compileReleaseKotlin` errored because that version bundles
  `play-services-ads:25.4.0`, whose Kotlin metadata (2.3.0) is newer than what RN 0.81/Expo
  SDK 54's Kotlin toolchain (2.1.0) can read. `16.0.0` bundles the older `play-services-ads
  :24.6.0`, which compiles cleanly. Re-check this pin when upgrading Expo SDK/RN versions —
  a newer Kotlin toolchain may make a newer `react-native-google-mobile-ads` safe again.

## Pricing
- **Monthly:** $6.99 — **Annual:** $59.99 (≈28% off paying monthly all year: $6.99 × 12 =
  $83.88, so $59.99 saves ~$23.89).
- These are the paywall's **fallback display strings** (`app/paywall.tsx`) shown only when
  RevenueCat can't resolve a real `PurchasesPackage` (e.g. no configured offering, no network).
  Real prices always come from `monthlyPkg?.product.priceString` / `annualPkg?.product
  .priceString` when available.
- **History:** these are the original prices. On 2026-09-05 they were briefly changed to
  $10/month, $100/year as part of the ads-only-tier redesign, then reverted back to $6.99/
  $59.99 the next day (2026-09-06) per a follow-up product decision — the ads-only
  differentiator model itself was kept, only the price points changed back.
- The actual Google Play subscription products at these price points still need to be created
  in Play Console and linked in RevenueCat — blocked behind BillDesk merchant verification,
  see `docs/TODO.md` item #1/#2. This doc's pricing is the target to configure once that
  clears, not something code alone can make real.

## What Changed, File by File
- **`lib/ads.ts`** — `showInterstitialIfDue(isPlus)`, UMP `gatherAdsConsent` /
  `getAdsConsentSnapshot` / `showAdsPrivacyOptions`, and the `canRequestAds` gate before
  loading an interstitial.
- **`app/_layout.tsx`** — cold-start `gatherAdsConsent()` so the form is never on Finish.
- **`app/timer/active.tsx`** — `onFinish` is now async: shows/awaits the interstitial (via
  `useProfile()`'s `isPlus`) before navigating to `/timer/complete`; both "Finish" buttons
  (immersive + boxed layouts) show a disabled "Loading…" state while this is in flight.
- **`app/(tabs)/settings.tsx`** — "Ad privacy" row when UMP requires a privacy-options entry
  point; upsell card subtext matches the paywall's single perk. While `PAYMENTS_ENABLED` is
  false the upsell is replaced by a non-tappable **TimeSense Plus · Coming soon** row (same
  perk copy, no purchase CTA) so the listing can ship for BillDesk verification without a
  broken buy flow. `isPlus` users still see Manage subscription.
- **`constants/theme.ts`** — `cat` style's `premium` flag flipped to `false`; comment updated
  to explain the flag is now unused but kept for shape stability.
- **`app/paywall.tsx`** — `FEATURES` trimmed to the single ads perk; hero subtitle changed to
  "Go ad-free"; hero banner's placeholder `View` swapped for a real `Image` of the app icon
  (`assets/images/icon.png`) — it had never actually been wired to any image; fallback prices
  are $6.99/$59.99 (briefly $10.00/$100.00 for one day, reverted — see Pricing section above);
  annual badge is "SAVE 28%" (was a hardcoded, never-computed "SAVE 30%" originally, briefly
  "2 MONTHS FREE" during the $10/$100 window); post-purchase alert copy updated to describe
  the ads perk instead of "all styles unlocked." While `PAYMENTS_ENABLED` is false the screen
  is info-only (Coming soon + Got it, no prices/Continue/Restore, no RevenueCat fetch).
- **`app.config.js`** — `react-native-google-mobile-ads` config plugin with test App IDs as
  defaults, plus `delayAppMeasurementInit: true` so measurement waits for consent.
- **`.env.example`** — AdMob App ID / ad unit env vars, plus optional
  `EXPO_PUBLIC_ADMOB_DEBUG_EEA` / `EXPO_PUBLIC_ADMOB_TEST_DEVICE_ID` for forcing the UMP form
  on a test device.
- **`docs/PLAY_STORE_LISTING.md`** — paste-ready Ads declaration + Data Safety table,
  including AdMob rows (2026-09-13).
- **`lib/legalContent.ts` / `docs/legal/privacy.html`** — ads, UMP, crash reporting; guest
  mode no longer claims zero third-party traffic.

## Real AdMob Account (2026-09-06)
- Created — Android app + one interstitial ad unit, owner `raju003`. App ID and ad unit ID are
  set as EAS env vars on the `preview` environment (`ADMOB_ANDROID_APP_ID`,
  `EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID_ID`), not committed to the repo — see `docs/TODO.md`
  item #14 for the exact values and current status.
- The AdMob app was added as **not listed on a store**, since `com.timesense.sys` isn't
  published on Play yet — needs re-linking to the real listing once it ships.
- AdMob's own UI warns new ad units can take **up to ~1 hour** before they start actually
  serving ads — a build right after creating the ad unit may briefly show no fill (handled
  gracefully: `lib/ads.ts` just proceeds to the complete screen on any load failure/timeout).
- New AdMob apps also go through an initial review period (roughly the first week) before
  reaching "Ready" status — expect this to show as pending for a bit, that's normal.
- No iOS app/ad unit created yet — not needed until an iOS build exists at all (none does
  currently, see item #8's platform scope in `docs/TODO.md`).

## Play Console / Store Listing Follow-up
- **Ads declaration** — answers to paste are in `docs/PLAY_STORE_LISTING.md` → "Play Console —
  Ads declaration": **Yes, ads / Google AdMob / not a kids' app**. Still needs typing into
  Play Console (`docs/TODO.md` item #6); a leftover "No ads" answer from the pre-AdMob draft
  will fail review.
- **Data safety form** — paste-ready table in the same doc (updated 2026-09-13). Includes
  AdMob Advertising ID, approximate location (IP), ad interactions, Sentry, and the purchase
  SDK (declare even while `PAYMENTS_ENABLED` is false). Re-check Play's category *labels* on
  the day you submit — they rename; the facts don't.
- **Privacy policy** — in-app (`lib/legalContent.ts`) and `docs/legal/privacy.html` disclose
  ads, UMP, and crash reporting as of 2026-09-13. **Redeploy GitHub Pages** so the live URL
  Play reviews is not the old "the app has no ads" text.
- **Before production release specifically:** complete the AdMob payments profile, re-link the
  AdMob app to the real Play Store listing, confirm AdMob's new-app review has cleared, and
  review AdMob's placement policies against the interstitial-on-Finish UX — full checklist in
  `docs/TODO.md` item #14. Create the GDPR UMP *message* in AdMob Privacy & messaging (item
  #17) — the in-app form will not have copy to show until that exists.

## UMP / GDPR consent (2026-09-13)
Decision: use Google's User Messaging Platform via `AdsConsent` on the already-installed
`react-native-google-mobile-ads` package. No extra CMP. Existing code was checked first
(no prior consent helper; invertase already ships UMP).

- **When:** `gatherAdsConsent()` on cold start (`app/_layout.tsx`) — not on Finish. A consent
  form on Finish would interrupt the save path and look like an accidental-click trap.
- **Gate:** `showInterstitialIfDue` only loads an ad when `interstitialIsDue` is true (not
  Plus, not web, and `canRequestAds`). If the user declined, Finish still navigates to
  complete — the ad is skipped. The 4s load timeout applies only to the ad request, never
  to the consent form.
- **Privacy options:** Settings → **Ad privacy** is shown only when UMP reports
  `privacyOptionsRequirementStatus === REQUIRED` (typically EEA/UK) and calls
  `AdsConsent.showPrivacyOptionsForm()`.
- **NPA:** ads are still requested with `requestNonPersonalizedAdsOnly: true` as a
  conservative extra layer on top of UMP, not a substitute for it. EEA still needs the form
  even for non-personalized inventory.
- **Init order:** `app.config.js` sets `delayAppMeasurementInit: true`. `MobileAds.initialize()`
  runs only after consent has allowed ads, on the first Finish that is due.
- **Dashboard dependency:** AdMob → Privacy & messaging → create a **GDPR** message for the
  Android app. Without it, `gatherConsent()` is a no-op form and EEA users may stay on
  `canRequestAds: false`. Optional US-state message is out of scope for this launch.
- **Debug:** `EXPO_PUBLIC_ADMOB_DEBUG_EEA=1` plus `EXPO_PUBLIC_ADMOB_TEST_DEVICE_ID` (hashed
  ID from logcat) forces the EEA form on a test device. Leave unset in production.

## Open Questions
- Whether to cap ad frequency (e.g. at most once per N minutes) rather than literally every
  Finish tap — this pass implements the literal "every Finish, standard tier only" behavior as
  requested; revisit if it proves too aggressive in testing.
- Whether to preload the interstitial ahead of the Finish tap (e.g. while the timer is still
  running) to reduce/eliminate the load-wait — this pass loads on-demand at Finish time only,
  bounded by a 4s timeout.

## Out of Scope / Follow-up
- ~~Real AdMob account creation, app ID / ad unit ID provisioning~~ — done 2026-09-06, see
  above.
- ~~UMP/consent code~~ — done 2026-09-13; remaining is the AdMob Privacy & messaging GDPR
  *message* plus Play Console paste (item #17).
- Real Google Play subscription products at $6.99/$59.99 — blocked behind BillDesk verification,
  tracked separately in `docs/TODO.md` items #1-#3.
