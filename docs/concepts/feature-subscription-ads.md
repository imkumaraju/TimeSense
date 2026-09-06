# Feature: Single-Tier Subscription, Ads-on-Finish

## Summary
TimeSense has exactly one paid tier — **TimeSense Plus** — sold as two packages (**$10/month**
or **$100/year**, ~2 months free on the annual plan). The **only** difference between Plus and
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
        Standard   → loads + shows a full-screen interstitial, resolves on close
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
- **Monthly:** $10.00 — **Annual:** $100.00 (≈2 months free vs. paying monthly all year:
  $10 × 12 = $120, so $100 saves $20, the value of 2 months).
- These are the paywall's **fallback display strings** (`app/paywall.tsx`) shown only when
  RevenueCat can't resolve a real `PurchasesPackage` (e.g. no configured offering, no network).
  Real prices always come from `monthlyPkg?.product.priceString` / `annualPkg?.product
  .priceString` when available.
- The actual Google Play subscription products at these price points still need to be created
  in Play Console and linked in RevenueCat — blocked behind BillDesk merchant verification,
  see `docs/TODO.md` item #1/#2. This doc's pricing is the target to configure once that
  clears, not something code alone can make real.

## What Changed, File by File
- **`lib/ads.ts`** (new) — `showInterstitialIfDue(isPlus)`, the whole ad-loading/showing/
  timeout logic described above.
- **`app/timer/active.tsx`** — `onFinish` is now async: shows/awaits the interstitial (via
  `useProfile()`'s `isPlus`) before navigating to `/timer/complete`; both "Finish" buttons
  (immersive + boxed layouts) show a disabled "Loading…" state while this is in flight.
- **`constants/theme.ts`** — `cat` style's `premium` flag flipped to `false`; comment updated
  to explain the flag is now unused but kept for shape stability.
- **`app/paywall.tsx`** — `FEATURES` trimmed to the single ads perk; hero subtitle changed to
  "Go ad-free"; fallback prices updated to $10.00/$100.00; annual badge changed from a
  hardcoded "SAVE 30%" (never actually computed from real prices) to "2 MONTHS FREE" (accurate
  for $10×12 vs. $100); post-purchase alert copy updated to describe the ads perk instead of
  "all styles unlocked."
- **`app/(tabs)/settings.tsx`** — upsell card subtext updated to match the paywall's single
  perk.
- **`app.config.js`** — added the `react-native-google-mobile-ads` config plugin with test App
  IDs as defaults.
- **`.env.example`** — documented the four new optional env vars (2 build-time App IDs, 2
  runtime ad unit IDs).
- **`docs/PLAY_STORE_LISTING.md`** — Data Safety form's "Ads: No ad SDKs" line needs updating
  once this ships for real (see Play Console follow-up below).

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

## Play Console / Store Listing Follow-up (not yet done)
- **Ads declaration** (Play Console → App content → Ads) must change from "No ads" to "Yes" —
  `docs/TODO.md` item #6 previously said "accurate — no ad SDKs in the app," which stops being
  true now that a real AdMob account exists and is wired in.
- **Data Safety form** needs an "Advertising ID" / third-party ad SDK data-sharing entry for
  AdMob once real ad units are live (test-ID-only *builds* arguably don't need this yet, since
  they never serve real ads to real users, but confirm Play's exact policy line before
  submission — the ad unit itself is now real, even though the app isn't published).
- A **UMP (User Messaging Platform) / consent flow** for GDPR/ATT-adjacent ad consent may be
  required depending on target regions once real ads are live — not implemented in this pass;
  flag as a pre-launch follow-up.
- **Before production release specifically:** complete the AdMob payments profile, re-link the
  AdMob app to the real Play Store listing, confirm AdMob's new-app review has cleared, and
  review AdMob's placement policies against the interstitial-on-Finish UX — full checklist in
  `docs/TODO.md` item #14.

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
- Real Google Play subscription products at $10/$100 — blocked behind BillDesk verification,
  tracked separately in `docs/TODO.md` items #1-#3.
