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
• A home screen widget that reflects your streak at a glance
• Works fully offline in guest mode — sign in only if you want cross-device sync
• Zero-friction by design: starting a timer is one tap from Home, task name
  and category are always optional

TimeSense Plus unlocks every visual timer style and priority cloud sync.

Built for people who find a ticking digital clock stressful, not motivating —
TimeSense is about self-knowledge, not pressure.
```

**Category:** Productivity (or Health & Fitness, depending on how you want to position it — Productivity is the closer fit for the calibration/estimation angle)

**Contact email:** imkumaraju@gmail.com

**Privacy policy URL:** `https://imkumaraju.github.io/TimeSense/legal/privacy.html` (already live, updated to disclose Sentry crash reporting)

## Data safety form

Matches what `lib/purchases.ts`, `lib/syncService.ts`, and `app/_layout.tsx` actually do:

| Data type | Collected? | Shared? | Purpose | Notes |
|---|---|---|---|---|
| Email address | Yes (only if user signs in) | No | Account management / authentication | Supabase Auth. Guest mode collects nothing. |
| App activity (task/timer/routine data) | Yes (only if signed in) | No | App functionality (cross-device sync) | Stored in Supabase Postgres; not used for ads/analytics |
| Crash logs | Yes | Yes — sent to Sentry (processor, not shared for advertising) | Analytics/crash reporting | Stack traces, device/OS/app version only — no task content |
| Device or other identifiers | No | — | — | No advertising ID usage |
| Purchase history | Yes | Yes — RevenueCat/Google Play Billing | App functionality (subscription entitlement) | Handled via RevenueCat, standard subscription flow |

**Data deletion:** Yes — in-app via Settings → Delete account (mention this explicitly in the form's account-deletion section; Play now requires a working in-app deletion path, which this app already has).

**Encryption in transit:** Yes (Supabase connections are HTTPS/TLS).

**Ads:** No ad SDKs.

## Assets

- [x] App icon — `docs/store-assets/icon-512.png` (resized from `assets/images/icon.png`, the Cat Loaf mascot)
- [x] Feature graphic — `docs/store-assets/feature-graphic-1024x500.png` (generated, icon + wordmark on brand orange)
- [x] Phone screenshots — captured from the `preview` build (2026-08-22), upload directly to Play Console in this order:
  1. Home screen with an active streak ("Good afternoon, Raju" / "1-day streak · 2 freezes")
  2. Active Pizza-style full-screen timer (02:46 remaining)
  3. Insights / "Your patterns" — predicted vs. actual duration chart
  4. Routines list (My schedule for Saturday / Moon day / Leg day)

  These also incidentally confirmed sign-in + sync work end-to-end (personalized greeting, synced streak, a completed timer with predicted/actual both showing) — migration 011 + Google OAuth setup verified working.

## Still needed before submission

- [ ] Content rating questionnaire answers (straightforward — no violence/gambling/etc. content, standard "Everyone" category expected)
- [ ] App content declarations (target audience age range — pick based on who TimeSense is actually for)
