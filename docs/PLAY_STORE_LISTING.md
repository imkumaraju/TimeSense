# Play Store Listing — Draft Content

Draft copy for Play Console's Store Listing + Data Safety form (Phase 5 of
[`DEPLOYMENT.md`](./DEPLOYMENT.md)). Everything text-based is ready to paste in; assets
(icon, feature graphic, screenshots) still need to be produced/captured separately.

## Store listing

**App name:** `TimeSense`

**Short description** (≤80 chars):
```
A visual, ADHD-friendly timer that learns how long your tasks really take.
```
(75 chars)

**Full description:**
```
TimeSense is a timer built for how ADHD brains actually experience time.

Instead of a plain countdown, every timer is a full-screen visual — a shrinking
pizza, a draining bar, a growing plant, a waning moon, and more — so remaining
time is something you can feel at a glance, not just read as a number.

Before you start, TimeSense asks how long you think a task will take. After
you finish, it logs how long it actually took. Over time this builds your own
personal calibration history, so you get better at estimating — the app shows
you patterns like "you tend to run long on chores" without ever judging you
for it.

FEATURES
• Bespoke full-screen visual timers — no digital countdown by default
• Predicted-vs-actual duration tracking that learns your patterns over time
• Recurring routines with reminders and scheduled notifications
• A home screen widget that shows today's routine at a glance
• Works fully offline in guest mode — sign in only if you want cross-device sync
• Zero-friction by design: starting a timer is one tap from Home, task name
  and category are always optional

TimeSense Plus (coming soon) will remove the ad shown after finishing a timer.
Every visual timer style is free for everyone.

Built for people who find a ticking digital clock stressful, not motivating —
TimeSense is about self-knowledge, not pressure.
```

**Category:** Productivity (or Health & Fitness, depending on how you want to position it — Productivity is the closer fit for the calibration/estimation angle)

**Contact email:** imkumaraju@gmail.com

**Privacy policy URL:** `https://imkumaraju.github.io/TimeSense/legal/privacy.html` (live; ads/UMP/Sentry wording deployed 2026-09-21).

## Play Console — Ads declaration

Play Console → Policy → App content → **Ads**. Paste answers:

| Question | Answer |
|---|---|
| Does your app contain ads? | **Yes** |
| Are the ads shown in the app from a third party? | **Yes — Google AdMob** (`react-native-google-mobile-ads`) |
| Ads shown to children / Designed for Families? | **No.** TimeSense is not a kids' app (see target-audience declaration). |

Placement for the reviewer (not a form field, but what they will see): one full-screen interstitial after the user **explicitly taps Finish** on an active timer, before the save screen. Controls are visible at that moment; it is not an accidental-click overlay on the running timer. TimeSense Plus (coming soon, not purchasable at launch) will skip this ad; until then every user sees it (`lib/ads.ts` `showInterstitialIfDue(isPlus)`).

## Data safety form

Play Console → Policy → App content → **Data safety**. Matches `lib/purchases.ts`, `lib/syncService.ts`, `lib/ads.ts`, and `app/_layout.tsx`. AdMob rows follow [Google's Mobile Ads SDK Data safety disclosures](https://support.google.com/admob/answer/11085002) — collected/shared by Google's SDK when an ad is requested, not stored on TimeSense servers.

**Overview questions**

| Question | Answer |
|---|---|
| Does your app collect or share user data? | **Yes** |
| Is all of the user data collected by your app encrypted in transit? | **Yes** (HTTPS/TLS to Supabase, Sentry, Google Ads) |
| Do you provide a way for users to request that their data is deleted? | **Yes** — Settings → Delete account (signed in) or Clear local data (guest) |

**Data types** — check each row in Play's current category names (they occasionally rename; if a label differs, pick the closest match and keep the notes):

| Play category | Collected? | Shared? | Optional? | Purpose(s) | Notes |
|---|---|---|---|---|---|
| Personal info → Email address | Yes (signed-in only) | No | Yes — users can stay in guest mode | App functionality | Supabase Auth. Guests do not send an email. |
| App activity → App interactions (task/timer/routine content) | Yes (signed-in only) | No | Yes — guest data stays on device | App functionality | Synced to Supabase Postgres. **Not used for advertising.** |
| App activity → App interactions (ad impressions/clicks) | Yes (when an ad is shown) | Yes — Google AdMob | Yes — UMP decline, or Plus (when available), skips the ad | Advertising or marketing | Collected by the AdMob SDK, not by TimeSense. Plus is coming soon and not purchasable at launch, so every user currently hits this path. |
| App info and performance → Crash logs | Yes (preview/production builds) | Yes — Sentry (processor) | No, for those builds | Analytics / App functionality | Stack traces, device/OS/app version. No task content. Dev builds do not send. |
| Location → Approximate location | Yes (when an ad is requested) | Yes — Google AdMob | Yes — same as ads | Advertising or marketing | Derived from IP by the AdMob SDK. TimeSense does not request GPS for ads. |
| Device or other IDs | Yes (when an ad is requested) | Yes — Google AdMob | Yes — UMP decline / Plus (when available) skips ads | Advertising or marketing | Includes Advertising ID. Ads are requested as **non-personalized** (`requestNonPersonalizedAdsOnly: true`). Plus never triggers this once it ships. |
| Financial info → Purchase history | Yes (if a Play purchase exists) | Yes — RevenueCat / Google Play Billing | Yes — purchases are optional; currently `PAYMENTS_ENABLED = false` so this path is unused at launch | App functionality | Declare it anyway: the purchase SDK is still in the app. |

**Third-party sharing:** Google AdMob (ads), Sentry (crash reports), RevenueCat/Google Play (purchases, when enabled), Supabase (signed-in sync — that's *your* backend, typically "collected by the app" not a separate advertiser).

**Data deletion:** Yes — in-app via Settings → Delete account. Play requires a working in-app deletion path, which this app already has.

If Play's form still has a leftover "No ads / no ad SDKs" answer from the pre-AdMob draft, overwrite it. Re-check the exact category labels in Console on the day you submit — they change more often than the facts above.

## Assets

- [x] App icon — `docs/store-assets/icon-512.png` (resized from `assets/images/icon.png`, the Cat Loaf mascot)
- [x] Feature graphic — `docs/store-assets/feature-graphic-1024x500.png` (generated, icon + wordmark on brand orange)
- [ ] Phone screenshots — the set captured from the `preview` build (2026-08-22) is now **stale**: screenshot 1 showed the Home screen's streak badge ("Good afternoon, Raju" / "1-day streak · 2 freezes"), which was removed 2026-09-05 (see `docs/TODO.md` — streaks are being redesigned, not gone for good). Re-capture before submission:
  1. Home screen (no streak badge anymore)
  2. Active Pizza-style full-screen timer (02:46 remaining)
  3. Insights / "Your patterns" — predicted vs. actual duration chart
  4. Routines list (My schedule for Saturday / Moon day / Leg day)

  The original set also incidentally confirmed sign-in + sync work end-to-end (personalized greeting, a completed timer with predicted/actual both showing) — migration 011 + Google OAuth setup verified working; that verification still stands, only the streak-badge screenshot itself needs a retake.

## Still needed before submission

- [ ] Content rating questionnaire answers (straightforward — no violence/gambling/etc. content, standard "Everyone" category expected)
- [ ] App content declarations (target audience age range — pick based on who TimeSense is actually for; **Ads = Yes**, see "Play Console — Ads declaration" above)
- [ ] Fill Data safety from the table above (includes AdMob Advertising ID, approximate location, ad interactions)
- [x] Redeploy `docs/legal/privacy.html` to GitHub Pages so the live privacy URL matches the ads/UMP wording (2026-09-21)
