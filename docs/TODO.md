# Production TODO — Live Tracker

Working tracker for shipping TimeSense to production. Written so a new session (human or
Claude) can pick this up cold — each item has enough context to act without re-deriving it.
Cross-references the fuller docs (`DEPLOYMENT.md`, `PLAY_STORE_LISTING.md`, `RUNBOOK.md`,
`BACKLOG.md`) rather than duplicating them; update *this* file's checkboxes as things move.

**Last updated:** 2026-08-22

---

## 🔴 Blocked — waiting on external review

### 1. BillDesk / Google Play merchant account verification
- **Status:** Application submitted 2026-08-22, Application ID `2608221684`. Awaiting BillDesk
  review email (typically hours to a few days for India merchant accounts).
- **Why it matters:** nothing that touches real money can proceed until this clears — no Play
  subscription products, no working RevenueCat pricing, no Play Store submission with billing.
- **Next action when it clears:** go to item #2 below.
- **If it's rejected/needs more info:** check the email from BillDesk, address whatever's
  flagged, most likely something in Personal Info / Bank Account Details / Business Info steps.

---

## 🟡 Blocked-behind-#1 — do these once merchant verification clears

### 2. Create real Google Play subscription products
- **Where:** Play Console → TimeSense app → Monetize → Products → Subscriptions.
- **What to create:** two subscription products matching what the app code expects:
  - Monthly — should map to RevenueCat's `$rc_monthly` product/entitlement
  - Yearly — should map to RevenueCat's `$rc_annual` product/entitlement
  - Current fallback prices shown in `app/paywall.tsx` (used only when RevenueCat can't
    resolve real pricing): $6.99/month, $59.99/year — use these as a starting point, or
    reprice as desired.
- **Then link in RevenueCat:** [app.revenuecat.com](https://app.revenuecat.com) → TimeSense
  project → Product catalog → Products → **TimeSense (Play Store)** section (currently empty —
  confirmed empty 2026-08-22, this is the actual root cause of the paywall bug, see item #3
  below) → Add/Import the two new Play products → attach each to the existing `default`
  offering's `Monthly`/`Yearly` packages (`$rc_monthly` / `$rc_annual`), replacing the
  placeholder products currently under **Test Store**.

### 3. Validate the paywall / RevenueCat end-to-end (real payment validation)
This is the actual root-cause chain for "Continue button does nothing" — confirmed via
RevenueCat dashboard screenshots on 2026-08-22:
- `default` offering exists, is marked **Current** ✅
- Packages `Monthly` (`$rc_monthly`) / `Yearly` (`$rc_annual`) exist ✅
- **But** the underlying products are under RevenueCat's **Test Store**, not the real
  **TimeSense (Play Store)** product list (which is empty) ❌
- Google Play Billing can only resolve real subscription pricing for products that exist in
  Play Console *and* are linked in RevenueCat's Play Store product list — a sideloaded/test
  build can't show real pricing until that's done.

**Validation checklist once #2 is done:**
- [ ] `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` is set for the `preview` EAS environment — **done**,
      confirmed via `eas env:list --environment preview` (2026-08-22). Verify it's the
      `com.timesense.sys` app's key specifically, not reused from the dev app, if pricing still
      doesn't resolve.
- [ ] Build a fresh `preview` or `release` APK/AAB after linking the real Play products
      (RevenueCat/Play product changes won't retroactively apply to an already-installed build
      until it re-fetches offerings, but a clean install is the safest test)
- [ ] Open the paywall screen — confirm real prices show (not the `$6.99`/`$59.99` fallback
      strings in `app/paywall.tsx`)
- [ ] Tap Continue — confirm it's enabled and opens the real Google Play Billing purchase sheet
- [ ] Complete a real sandbox/license-tester purchase (Play Console → Setup → License testing →
      add your Google account as a license tester first, so you're not charged real money)
- [ ] Confirm `mirrorEntitlement()` in `lib/purchases.ts` actually flips the local profile's
      `subscriptionTier` to `'plus'` after purchase — check Settings screen reflects Plus status
- [ ] Tap "Restore purchase" on a second/reinstalled build, confirm entitlement restores
- [ ] Test cancellation flow via `showManageSubscriptions()` (Settings → Manage subscription)

### 4. First real `release` build + Play Console upload
- Once #2/#3 pass: `npx eas-cli build --profile release --platform android`
- Upload resulting `.aab` to Play Console **Internal testing** track (see `DEPLOYMENT.md` Phase 5)
- Install via the internal testing link on a real device, sanity-check sign-in + sync + paywall
  one more time on the actual Play-distributed build (not sideloaded)
- Promote Internal → Production when confident (staged rollout percentage recommended for the
  first production release)

---

## 🟢 Not blocked — can do anytime

### 5. Play Console — Content rating questionnaire
- Play Console → TimeSense app → Policy → App content → Content ratings
- Expected outcome: "Everyone" — no violence, gambling, mature content, user-generated content
  shared publicly, etc.

### 6. Play Console — App content declarations
- Target audience age range — pick based on who TimeSense is actually for (not specifically a
  kids' app; likely broad adult/general audience given the ADHD-productivity framing)
- Ads declaration: **No ads** (accurate — no ad SDKs in the app)
- Data safety form: use the table already drafted in `docs/PLAY_STORE_LISTING.md` → "Data
  safety form" section — cross-checked against actual code (`lib/purchases.ts`,
  `lib/syncService.ts`, `app/_layout.tsx`'s Sentry usage). **Keep `docs/legal/privacy.html` in
  sync if this ever changes** — it was already corrected once (see below).

### 7. Play Console — Store listing page
- Content fully drafted in `docs/PLAY_STORE_LISTING.md` (short description, full description —
  updated 2026-08-22 to mention notifications + the home screen widget, category, contact
  email, privacy policy URL)
- Assets ready in `docs/store-assets/`: `icon-512.png`, `feature-graphic-1024x500.png`
- 4 screenshots captured from a real device 2026-08-22 (Home w/ streak, active Pizza timer,
  Insights, Routines) — not saved to repo, upload directly from wherever you saved them out of
  chat
- [ ] Confirm this page is actually filled in and saved in Play Console (last known status:
      guided through it, not yet confirmed complete)

---

## 🔵 Backlog — real feature work, not blocking this release

### 8. Tablet support
- **Current state:** `app.config.js` has `orientation: 'portrait'` locked globally; no
  responsive/tablet-specific layouts exist anywhere in `components/` or `app/`. Every screen is
  single-column, phone-sized.
- **Why it's not in this release:** submitting tablet screenshots or claiming tablet support
  for a phone-only layout looks worse than not claiming it — Play Store tablet screenshots are
  optional and were skipped for this reason (2026-08-22 decision).
- **What real tablet support would need:**
  - Decide whether to unlock `orientation` (currently hard-locked portrait) for tablets, or
    keep portrait-only and just ensure layouts don't look broken/stretched on larger screens
  - Audit `components/ui/` primitives (`TsButton`, `TsCard`, `TsChip`) and screen layouts
    (`app/(tabs)/`, `app/timer/`) for fixed widths / lack of max-width constraints that would
    stretch awkwardly on a 10" screen
  - The full-screen visual timer components (`components/timer/*`) especially need checking —
    they're SVG/reanimated and likely scale, but haven't been verified on tablet aspect ratios
  - Test on an actual tablet emulator (Play Console's testing tools, or Android Studio AVD)
  - Once verified, capture 7" and 10" tablet screenshots and add them to the Play Store listing
- **Not started.** No code changes made toward this yet — pure backlog item.

---

## Reference — other docs this tracker points into

| Doc | What's in it |
|---|---|
| [`DEPLOYMENT.md`](./DEPLOYMENT.md) | Full ordered deployment checklist (accounts, OAuth, EAS, Play phases) — the source this TODO was distilled from |
| [`PLAY_STORE_LISTING.md`](./PLAY_STORE_LISTING.md) | Actual store listing copy, Data Safety form table, asset inventory |
| [`RUNBOOK.md`](../RUNBOOK.md) | Backup/restore — **done and verified**, nothing pending here |
| [`BACKLOG.md`](./BACKLOG.md) | Sign in with Apple (parked, out of scope for this release) |
| [`GITHUB_PROMOTION.md`](./GITHUB_PROMOTION.md) | `dev` → `sys` branch promotion flow |

## Also resolved this session — account/auth fixes found while working the Play Console checklist

- Migration `012_profile_email_and_username_unique.sql` — **committed and applied to both
  dev and sys** (2026-08-22). Adds `profiles.email` (trigger-populated from
  `auth.users.email` on every signup path — password, magic link, or Google; not
  client-writable) and a case-insensitive unique index on `username` (previously
  unconstrained — two users could pick the same one silently).
- Fixed `signInWithMagicLink` using a stale hardcoded `timesense://auth/callback` scheme
  instead of the env-aware `getAuthRedirectUri()` helper Google sign-in already used —
  magic link would have redirected to the wrong/nonexistent scheme on real dev/sys builds.
- `signUpWithEmail` now surfaces "That username is already taken — try another" instead of
  a raw Postgres unique-violation error.
- Fixed `db:migrate:dev` / `db:migrate:prod` npm scripts silently failing on Windows — they
  used bash-style `$VAR` syntax, but `npm run` shells through `cmd.exe` on Windows
  regardless of the invoking terminal, so the variable never expanded. Replaced with
  `scripts/db-migrate.js`, a small Node wrapper that reads `process.env` directly
  (shell-agnostic).
- **Open question, not yet root-caused:** user reported "invalid login credentials" on
  first sign-in attempt right after confirming a brand-new email/password signup via the
  confirmation email link. Leading hypothesis: Supabase silently no-ops a repeat `signUp()`
  call to an email that exists-but-unconfirmed (anti-enumeration behavior) — if signup was
  attempted twice with different passwords before confirming, the second password never
  actually took effect. Not reproduced/confirmed with certainty — if it recurs, check the
  Supabase Users table for that email's `email_confirmed_at` and creation timestamp history.

## Already resolved this session (2026-08-22) — kept for context, not action items

- Fixed `app/paywall.tsx` + `lib/purchases.ts` to show a visible error instead of a silently
  disabled Continue button when RevenueCat offerings fail to load
- Committed & applied migration `011_authenticated_grants.sql` (both dev + sys) — fixed
  signed-in sync failing with "permission denied" (missing table-level GRANTs)
- Added `eas.json` `release` profile (app-bundle, store distribution) separate from `preview`
  (APK, internal sideload) — Play requires app-bundle for new apps
- Set `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` for the `preview` EAS environment
- Confirmed Google OAuth (sys) + Supabase redirect allow-list + consent screen publishing all
  already correctly configured
- Confirmed backups + keep-alive (Phase 6) fully working — verified via GitHub Actions run
  history, including a successful restore-test
- Fixed `docs/legal/privacy.html` — it claimed "no crash-reporting SDKs" while Sentry is
  actually wired into `app/_layout.tsx` for preview/production builds; corrected to disclose it
  accurately
- Verified sign-in + sync work end-to-end via real device screenshots (personalized greeting,
  synced streak, synced completed timer)
