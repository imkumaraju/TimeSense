# Production TODO — Live Tracker

Working tracker for shipping TimeSense to production. Written so a new session (human or
Claude) can pick this up cold — each item has enough context to act without re-deriving it.
Cross-references the fuller docs (`DEPLOYMENT.md`, `PLAY_STORE_LISTING.md`, `RUNBOOK.md`,
`BACKLOG.md`) rather than duplicating them; update *this* file's checkboxes as things move.

**Last updated:** 2026-09-05 (item #12: pizza/plant/monk/cat/moon migrated to static images,
`expo-image` fix for an over-zoom bug; item #13: all streak/freeze UI removed, logic parked in
`docs/BACKLOG.md` for redesign; item #14: subscription simplified to a single ads-only
differentiator, AdMob interstitial added on Finish)

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
  - Target prices (2026-09-05 decision, see `docs/concepts/feature-subscription-ads.md`):
    **$10/month, $100/year** (~2 months free on annual) — `app/paywall.tsx`'s fallback display
    strings already show these; the real Play Store products need to be created at these
    price points to match.
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
- Ads declaration: **Yes, ads** — no longer "No ads" as of item #14 (AdMob interstitial added
  2026-09-05 for the standard tier's ads-on-finish). Update this before submission; also add
  the Data Safety form's third-party ad SDK entry once real AdMob ad units are live (test-ID
  builds may not need it — confirm Play's current policy line).
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

### 9. Plant timer theme — video animation (superseded, see item #12)
- **Spec (superseded 2026-09-05):** originally built against
  `docs/concepts/feature-timer-theme-video-scrub.md` (continuous playhead scrubbing), then
  migrated through the intro/loop/outro and intro/freeze-hold/resume segment models (item #11
  below). **All of that is now superseded** — plant is a static illustrated image, see item
  #12. Kept for historical context only; no action items remain here.

### 10. Full-screen immersive timer view (video-scrub styles)
- **Spec:** `docs/concepts/feature-fullscreen-immersive-timer.md` — the plant timer's video
  now fills the entire screen edge-to-edge (no bounded square) with all control UI (Back,
  Hide clock, Pause, +5 min, Got distracted, Finish) auto-hiding ~2s after start/resume and
  reappearing on tap; SVG styles are unaffected and keep the original centered layout.
- **Decisions made answering the spec's open questions (2026-08-22):** scoped to video-scrub
  styles only (not all styles); "Got distracted" suspends the auto-hide idle timer the same
  way Pause does (it already calls `pause()`, so this falls out for free).
- **Built and wired (2026-08-22):** `app/timer/active.tsx` branches into an immersive layout
  via `isVideoScrubStyle()` (`lib/timerThemes.ts`); the video-scrub player component(s) (now
  `SegmentVideoTimer.tsx`, see item #11 — was `VideoScrubTimer.tsx` until the 2026-08-23
  migration)/`VisualTimer.tsx` got a `fullBleed` prop; `expo-linear-gradient` installed for the
  top/bottom scrims behind the control clusters. Countdown clock visibility stays independent
  of the controls auto-hide, per spec.
- **Not yet done:**
  - [ ] Run on-device and confirm the fade timing/scrim legibility actually looks right
        against real video content, and that tap-to-reveal / idle-hide / pause-suspend all
        feel correct in practice
  - [ ] A second EAS `preview` build is needed for this (new native dep,
        `expo-linear-gradient`) — same as the video-scrub feature required one for
        `expo-video`.

### 11. Monk + plant timer themes — video animation (superseded, see item #12)
- **Spec history (all superseded 2026-09-05):** continuous playhead scrubbing
  (`feature-timer-theme-video-scrub.md`) → intro/loop/outro
  (`feature-timer-theme-intro-loop-outro.md`) → intro/freeze-hold/resume
  (`feature-frame-sequence-animation.md`). Each traded one video-authoring problem for another
  (loop seams, drift, freeze/resume timing) — see item #12 for why this line of iteration was
  dropped entirely in favor of static images. Kept for historical context only; no action
  items remain here. `SegmentVideoTimer.tsx` and the landed `monk.mp4`/`plant.mp4` assets are
  left in place, unused, per item #12.

### 12. Pizza + plant + monk + cat + moon timer themes — static illustrated images
- **Spec:** `docs/concepts/feature-static-theme-images.md` — supersedes the entire
  video-animation line (items #9/#11) and the original SVG rendering for `pizza`'s default
  style, `cat`, and `moon`. No playback, no timing, no segment boundaries: one illustrated
  image per theme, shown full-screen for the life of the session.
- **Built and wired (2026-09-05):** `lib/timerThemes.ts` (`StaticThemeConfig` type,
  `pizzaTheme`/`plantTheme`/`monkTheme`/`catTheme`/`moonTheme` configs, `staticThemes`
  registry, `isStaticImageStyle()` — replacing
  `SegmentThemeConfig`/`segmentThemes`/`isVideoScrubStyle()`),
  `components/timer/StaticImageTimer.tsx` (new renderer: just an `Image` plus the "got
  distracted" desaturation-dip overlay, ported from `SegmentVideoTimer.tsx`'s same cue logic),
  `VisualTimer.tsx` wired `pizza`/`plant`/`monk`/`cat`/`moon` to it, `app/timer/active.tsx`
  renamed its immersive-layout check to `isStaticImageStyle()` (now covers all five styles, not
  just `plant`/`monk`, so `pizza`/`cat`/`moon` also get the full-bleed layout from
  `feature-fullscreen-immersive-timer.md` for the first time; the old moon-specific
  `contentWidth` sizing branch in `active.tsx` was removed as dead code alongside this).
- **Source images landed:** `assets/timer-themes/{pizza,plant,monk,cat,moon}/<theme>.png`,
  portrait 9:16, ~5.6-7MB each (PNG, not the spec's recommended WebP — see the spec doc's
  "Implementation Notes" section).
- **On-device bug found + fixed (2026-09-05):** first `sys` preview build showed all five
  themes badly over-zoomed full-bleed (e.g. monk showed only the tree canopy, monk figure
  never visible) — traced to React Native core `<Image>`'s `resizeMode="cover"` not reliably
  covering when sized via `StyleSheet.absoluteFill`. Fixed by switching
  `StaticImageTimer.tsx` to `expo-image`'s `<Image contentFit="cover">` (new dependency, added
  via `npx expo install expo-image`) — same API already used for `expo-video`. **This adds a
  new native module, so it needs a fresh EAS build** (same as `expo-video`/
  `expo-linear-gradient` did) — not yet built/tested on-device as of this note.
- **Not yet done:**
  - [ ] Build + run on-device with the `expo-image` fix: confirm the fullBleed crop now looks
        correct (near-full image height, mild side-crop) for all five themes, and the
        desaturation-dip cue still looks right.
  - [ ] Re-encode the five PNGs to WebP (or JPEG) per the spec's size guidance — current PNGs
        are noticeably larger than the ~2-6MB video assets they replaced.
  - [ ] `SegmentVideoTimer.tsx`, `CatLoaf.tsx`, `MoonArc.tsx`, and the old `monk.mp4`/`plant.mp4`
        video assets are now unused — left in place per repo convention (same as
        `BanyanMonk.tsx` before them); delete once the image versions are confirmed as the
        permanent replacement.
  - [ ] Confirm usage rights/commercial terms for all five source images before a production
        build ships them.

### 13. Streaks removed from UI/widget — logic parked in backlog for redesign
- **What happened (2026-09-05):** streaks are getting rethought as a feature, so all
  user-facing streak/freeze surfaces were removed while the DB schema and pure algorithm stay
  in place untouched. See `docs/BACKLOG.md` → "Deferred: Rethink streaks" for the design-level
  open questions.
- **Removed:**
  - `app/(tabs)/index.tsx` — Home screen streak badge (state + render + now-unused `badge*`
    styles)
  - `app/(tabs)/settings.tsx` — "Streak" row, "Streak freezes" row, and the "Watch an ad for a
    streak freeze" card (+ now-unused `rowCardDisabled`/`rowLabelMuted`/`rowSubMuted` styles)
  - `app/timer/complete.tsx` — no longer calls `recordStreakOnTaskComplete()` or
    `markWidgetOneDayFlags()` on task completion, so `streak_count`/`freezes_available`/
    `last_active_date` simply stop advancing from whatever value they're frozen at
  - `lib/widgetSnapshot.ts` — `computeWidgetMood()` trimmed to routine-due-today state only;
    dropped the `sad`/`happy`/`freeze` streak-driven mood branches, `streakCount` from
    `WidgetSnapshot`, `markWidgetOneDayFlags()`/`streakLostToday()`/one-day AsyncStorage flags
    entirely. `ensureLastChanceWidgetTrigger()`'s silent 22:00 notification mechanism stays
    (still useful for the routine-deadline "worried" mood), just re-worded away from "streak."
  - `widgets/StreakWidget.tsx` — removed the top-left streak badge (`STREAK_ICON`/
    `streakLabel`); `lib/chibiTabbySvg.ts`'s mood art for `sad`/`happy`/`freeze` is unreachable
    now but left in place (harmless, reusable if the redesign wants similar mascot states)
  - `app.config.js` — Android widget renamed from `name: 'Streak'` / `'TimeSense Streak'` to
    `name: 'Routine'` / `'TimeSense Routine'` (system-visible in the widget picker) — matched
    in `lib/widgetSnapshot.ts`'s `requestWidgetUpdate({ widgetName: 'Routine' })` call. **This
    is a native config change and needs a fresh EAS build**, same as the image-timer fix above.
  - `docs/PLAY_STORE_LISTING.md` — dropped the streak-widget bullet from the feature list;
    flagged the existing screenshot set as stale (screenshot 1 shows the now-removed streak
    badge) pending a re-capture before submission.
  - `lib/__tests__/widgetSnapshot.test.ts` — rewritten for the trimmed `computeWidgetMood()`
    signature (dropped the streak-lost/milestone/freeze test cases).
- **Deliberately left alone:** `lib/streakLogic.ts`, `lib/streakService.ts` (unused by the app
  now, but not deleted), all `supabase/migrations/*.sql` streak columns,
  `lib/__tests__/streakLogic.test.ts`, `docs/concepts/streak-logic-feature-spec.md`. `useProfile.ts`
  still calls `getStreakProfile()` for its `isPlus` entitlement check — that's just how it
  fetches the local `Profile` row, not a streak display, so it stays as-is.
- **Not yet done:**
  - [ ] Build + test on-device with the widget's new name/content (needs the same fresh EAS
        build as item #12's `expo-image` fix — bundle both into one build)
  - [ ] Re-capture the Play Store screenshot set (item #7) now that the Home streak badge is
        gone

### 14. Single-tier subscription simplified to ads-only differentiator
- **Spec:** `docs/concepts/feature-subscription-ads.md` — TimeSense Plus's only remaining
  perk is no ads. Standard-tier users see a full-screen AdMob interstitial immediately after
  tapping "Finish" on an active timer, before the task-complete/save screen; Plus users never
  see it. All timer styles (including Cat Loaf) are now free for everyone — the `premium`
  style-gating mechanic and "priority sync" paywall claim are both retired.
- **Built and wired (2026-09-05):** `lib/ads.ts` (new — `showInterstitialIfDue(isPlus)`,
  dynamically imports `react-native-google-mobile-ads` so it's safe in Expo Go, has a 4s load
  timeout so a slow/broken ad network never blocks finishing a timer); `app/timer/active.tsx`'s
  `onFinish` is now async and shows the interstitial via `useProfile()`'s `isPlus` before
  `router.replace('/timer/complete')` (both Finish buttons show a disabled "Loading…" state
  meanwhile); `constants/theme.ts`'s `cat` style `premium` flag flipped to `false`;
  `app/paywall.tsx` and `app/(tabs)/settings.tsx`'s upsell copy trimmed to the single ads perk,
  fallback prices updated to $10.00/mo, $100.00/yr, annual badge changed from a hardcoded
  (and never-accurate) "SAVE 30%" to "2 MONTHS FREE"; `app.config.js` registers the
  `react-native-google-mobile-ads` config plugin with Google's public test AdMob App IDs as
  defaults; `.env.example` documents the override env vars.
- **This adds a new native dependency (AdMob SDK) — needs a fresh EAS build**, same category
  as `expo-video`/`expo-linear-gradient`/`expo-image` before it. Bundle with items #12/#13's
  pending builds if not already shipped.
- **Not yet done:**
  - [ ] Build + test on-device: confirm the interstitial (test ad) actually shows for a
        standard-tier account on Finish, and does *not* show for a Plus account
  - [ ] Real AdMob account + app ID + ad unit ID — only the account owner can create these;
        set via `ADMOB_ANDROID_APP_ID`/`ADMOB_IOS_APP_ID` (build-time) and
        `EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID_ID`/`_IOS_ID` (runtime) once they exist
  - [ ] Real Google Play subscription products at $10/month, $100/year — blocked behind item
        #1/#2 (BillDesk merchant verification)
  - [ ] Play Console ads declaration + Data Safety form update (see item #6)
  - [ ] Decide on a UMP/consent flow for ad-related GDPR/regional requirements before shipping
        real (non-test) ads — not implemented in this pass
  - [ ] Consider whether "ad on every single Finish tap" is too aggressive once tested on a
        real device — open question in the spec doc

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
