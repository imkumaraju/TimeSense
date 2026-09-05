# TimeSense backlog

## Deferred: Rethink streaks

**Parked:** 2026-09-05

**Why deferred:** All streak/freeze UI and logic invocation was pulled from the app and widget
(Home badge, Settings rows, the "watch an ad for a freeze" card, the widget's streak badge and
mood swings) because the whole feature needs a product rethink before it's worth showing users
again — not because anything was broken. See `docs/TODO.md` for the full list of what was
touched.

**What's still in place, deliberately:** `lib/streakLogic.ts` (pure algorithm) and
`lib/streakService.ts` (I/O wrapper) are untouched but no longer called from
`app/timer/complete.tsx` — streak/freeze columns (`streak_count`, `freezes_available`,
`last_active_date`) stay in the DB schema (local SQLite + Supabase) and simply stop advancing
from whatever value they were at when this landed. `docs/concepts/streak-logic-feature-spec.md`
is the existing design doc for the algorithm, kept as reference for whatever replaces it.

### Open questions for the redesign

- [ ] Whether to keep the calendar-day-gap + freeze model at all, or replace the mechanic
      entirely
- [ ] What (if anything) replaces the widget's mood-driven mascot states (`sad`/`happy`/
      `freeze` in `lib/chibiTabbySvg.ts` are still implemented, just unreachable — reusable if
      the new design wants similar mascot expressions)
- [ ] Whether existing users' frozen `streak_count`/`freezes_available` values should carry
      forward into whatever ships next, or reset
- [ ] Re-decide the widget's identity/name now that it's routine-only (`app.config.js`
      currently calls it "TimeSense Routine" as a placeholder)

## Deferred: Sign in with Apple

**Parked:** 2026-08-03

**Why deferred:** No iOS device available for testing right now. Android (and web) Apple OAuth also requires an Apple Developer Services ID plus JWT secret configuration before it can work end-to-end.

**Setup guide:** [supabase/SOCIAL_AUTH_SETUP.txt](../supabase/SOCIAL_AUTH_SETUP.txt)

App-side `signInWithApple` in `stores/authStore.ts` and OAuth helpers remain in place; only the auth-screen button is hidden.

### Remaining work

- [ ] **Supabase Apple Client IDs:** `host.exp.Exponent,com.timesense.dev,com.timesense.sys,com.timesense` (retire `com.timesense.app`)
- [ ] **URL Configuration redirects** (Site URL + additional redirect URLs per setup guide)
- [ ] **Apple Developer:** Enable Sign in with Apple on App IDs `com.timesense.dev`, `com.timesense.sys`, `com.timesense`
- [ ] **Optional (Android / web):** Services ID, Return URL (Supabase callback), `.p8` key, Team ID, Key ID, JWT secret in Supabase
- [ ] **Re-enable Apple button** in `app/auth/index.tsx` (restore availability check + button JSX)
- [ ] **Test on real iPhone** (Expo Go + EAS build)
- [ ] **Optional:** Official `AppleAuthenticationButton` / HIG styling
