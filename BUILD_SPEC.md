# TimeSense — ADHD Time-Blindness App

### Build Spec for Cursor

## 1. Concept

An app that helps people with ADHD *feel* time passing instead of reading it, and builds
a personal calibration history between predicted vs. actual task duration.

Two core features:

1. **Visual/Analog Timer** — default is an **eating pizza** (time left = pizza left on the
   plate); also pie / draining bar / ring. Not digit-first.
2. **Time Cost Estimator** — before a task, log a predicted duration; after, log actual duration.
   Over weeks, the app shows patterns ("you underestimate cleaning tasks by ~40%").

---

## 2. Tech Stack (cross-platform iOS + Android)

**Framework:** React Native + Expo (managed workflow)

- Single codebase, ships to both App Store and Play Store.
- Expo handles push notifications, background tasks, and OTA updates without native build pain.
- Use **Expo Router** for file-based navigation.

**Language:** TypeScript throughout.

**UI / Animation:**

- `react-native-reanimated` (v3) — for smooth 60fps timer animations when used (pizza clip /
  pie / bar / ring). Expo Go may use simpler non-Reanimated paths for stability.
- `react-native-svg` — to draw pizza / pie / arc / bar shapes.
- `react-native-gesture-handler` — for any drag/tap interactions.
- Avoid heavy UI kits; build custom components — the timer visual is the product, it needs
  to be bespoke and fluid, not a generic progress bar.

**State management:** Zustand (lightweight, avoids Redux boilerplate) or React Context if
the app stays simple.

**Local storage / persistence:**

- `expo-sqlite` (via Drizzle ORM or raw SQL) for task history, predictions vs. actuals —
  this is relational data (tasks, sessions, categories) so SQLite is the right fit over
  AsyncStorage.
- `AsyncStorage` only for simple key-value settings (theme, sound on/off, default timer style).

**Notifications:** `expo-notifications` — for "time's up" alerts and gentle check-in nudges
("still working on this?").

**Background timer accuracy:**

- Timers must keep accurate elapsed time even if the app is backgrounded — store a
  `startTimestamp` + `durationSeconds` and always calculate `elapsed = now - startTimestamp`,
  never rely on a running JS interval alone. Use `expo-task-manager` / background fetch only
  if you want background progress notifications; the core timer math should be
  timestamp-based regardless.

**Charts (for calibration history):** `victory-native` or `react-native-svg` custom charts —
victory-native is simpler to start with for bar/scatter comparisons of predicted vs. actual.

**Backend & Auth:** **Supabase** — Postgres database + built-in auth + storage, all on one
cheap/generous free tier (500MB DB, 50k monthly active users free; paid tier starts around
$25/mo only once you outgrow that). Reasons it fits here:

- **Auth** — `@supabase/supabase-js` + `@supabase/auth-helpers` gives email/password, magic
  link, and OAuth (Google/Apple — Apple Sign-In is required by App Store if you offer any
  other social login) out of the box. No need to run your own auth server.
- **Database** — Postgres, so the same relational schema from the SQLite section below maps
  over almost directly.
- **Row-Level Security (RLS)** — Postgres RLS policies scope every row to `auth.uid()`, so
  users can only ever read/write their own data — this is the "reliable and cheap" way to
  keep per-user data safe without writing custom backend logic.
- **Realtime/offline** — pair with local SQLite as an offline cache (see sync strategy
  below) so the app still works with no signal, and syncs when back online.

Alternative if you want to stay even cheaper/simpler for MVP: Firebase (Auth + Firestore) —
similar pricing shape, slightly less SQL-friendly, but has a very mature React Native SDK too.
Supabase is recommended here specifically because the data model (tasks with predicted/actual
durations, categories) is naturally relational and benefits from real SQL + RLS.

**Sync strategy:** Keep `expo-sqlite` as the local source of truth the timer UI reads/writes
to instantly (so the core timer experience never waits on a network call), then sync rows to
Supabase in the background (see §4 for the cost-conscious rules):

- On task complete (write), push the row to Supabase immediately if online, else queue it
  (a simple `synced` boolean column) and flush the queue on reconnect/app foreground.
- On login / app foreground, **delta-pull** rows for `auth.uid()` where
  `updated_at > :last_sync_watermark` into local SQLite — never re-fetch full history on
  routine sync. Full pull is only for a brand-new empty local DB after login.
- This gives offline-first reliability plus cross-device backup without making the live timer
  depend on network latency.

**Testing:** Jest + React Native Testing Library for logic (especially the elapsed-time
math and estimator statistics).

**Build/Deploy:** EAS Build (Expo Application Services) for iOS/Android binaries, EAS
Submit for store submission.

---

## 3. Core Screens

### 3.0 Daily Open — Style Showcase (removed 2026-09-06)

> Removed entirely per product decision — `app/index.tsx` now redirects straight to Home on
> every open, no daily gate. `lib/showcaseGate.ts`, `app/showcase.tsx`, and
> `components/showcase/ShowcaseStyleIcon.tsx` were deleted; the `showcase` route was
> unregistered from `app/_layout.tsx`. `docs/concepts/first-launch-showcase.md` is kept as
> historical reference for the design if a first-open/onboarding flow is wanted again later.

- ~~Shown on the **first open of each local calendar day**
  (`timesense.showcase.last_shown_date`).~~
- ~~Conveyor belt of style icons (Radial → Slices → Plant → Moon → Sky → Garden → Monk →
  **Cat Loaf**), one pass (~4.5s), then Home. Skip always available.~~
- ~~Closing tile is the **app icon** (Cat Loaf: cream loaf, crust-dark ear shading, basil eyes
  on crust). See `docs/concepts/first-launch-showcase.md`.~~

### 3.1 Sign Up / Log In

- Email + password, plus "Sign in with Apple" (required alongside any other social option
  for App Store approval) and optionally "Sign in with Google."
- Magic-link option is a nice zero-password fallback (good for a low-friction audience —
  fewer forgotten passwords blocking someone from just starting a timer).
- Allow a **"skip for now / use offline"** guest mode that stores data locally only — let
  people prompt-to-sign-up later once they see value, rather than gating the whole app
  behind auth on first open. Prompt to create an account when they try to leave the app
  or after their first few completed timers, framed as "back up your data."

### 3.2 Home / Today

- List of active/recent timers.
- Big "+ New Timer" button.
- Quick-start presets (e.g. "5 min", "25 min Pomodoro", "Custom").
- "Today's Routines" section (see §9.3) sits above Recent once Routines exist.

### 3.3 New Timer / Task Setup

- Task name (optional — if blank, use a timestamp title e.g. `Timer · Aug 1, 12:03 PM`).
- Description (optional short text — what you're working on).
- Predicted duration input (this is the "time cost estimator" prediction step) — big, fast
  number picker, not a tiny text field.
- Timer visual style toggle: **Eating Pizza** (default) / Pie / Draining Bar / Ring.
- Category tag (optional): Chores, Work, Study, Errands, Creative, Other — used later for
  calibration analytics.
- "Repeat" toggle (see §9) — turns this task into a recurring Routine instead of a one-off
  timer.

### 3.4 Active Timer (the core screen)

- Full-screen visual: **pizza** (default) / pie / bar / ring shrinking in real time; non-pizza
  styles may color-shift (e.g. green → yellow → red) for sensory feedback.
- No digital countdown shown by default — optional toggle to reveal MM:SS for users who
  want both.
- Pause/resume, add time (+5 min), and "I'm done early" / "finish" buttons.
- Gentle sound/haptic pulse at key milestones (halfway, 1 min left, time's up) — configurable.

### 3.5 Task Complete → Actual Duration Capture

- On finish (early or on time), ask: "How long did that actually take?" — pre-filled with
  the timer's elapsed time if they let it run to completion, editable if they multitasked
  or paused a lot.
- Quick "How did that feel?" — optional 3-icon mood tag (too fast / about right / dragged on).

### 3.6 Calibration History / Insights

- Chart: predicted vs. actual, per category, over time.
- Plain-language insight cards: "You tend to underestimate [Chores] by 35%." Generated from
  simple stats (rolling average of `(actual - predicted) / predicted` per category), not AI —
  keep v1 deterministic and explainable.
- Filter by category / time range.

### 3.7 Settings

- Account (email shown, sign out, delete account — deleting must cascade-delete their
  Supabase rows via RLS-safe server logic or a Postgres `ON DELETE CASCADE`).
- Default timer visual style.
- Sound/haptic preferences.
- Data export (CSV) / clear history.
- Sync status indicator (last synced time, manual "sync now" button for peace of mind).

---

## 4. Data Model — Cost-Conscious Strategy

*Note: `routines` + local-only `routine_notifications` are defined in §9. Sync `routines`
(and `tasks.routine_id`); never sync notification IDs.*

**Guiding principle:** for this app, database *storage* is a non-issue (rows are tiny — a
name, a couple of integers, a few timestamps), so 500MB free-tier storage lasts years. The
real cost lever on a free/cheap Supabase tier is **egress (bandwidth)** and connection usage,
not row count. Every decision below optimizes for *fewer, smaller* network round-trips, not
for a smaller schema.

Rules Cursor should follow throughout implementation:

1. **Local-first** — `expo-sqlite` is what the UI reads/writes; Supabase is a backup/sync
   target, never a live dependency for rendering the timer.
2. **Delta sync only** — never re-fetch a user's full history. Sync only rows changed since
   the last sync, using an `updated_at` watermark.
3. **No Realtime subscriptions** — this is a single-user app; a plain pull-on-foreground /
   push-on-write pattern is both cheaper and simpler than an open Realtime channel.
4. **No stored/synced insights** — insights are computed entirely on-device from the local
   SQLite cache. Never write insight rows to Supabase and never query Supabase for them.
5. **Keep every table narrow** — no JSON blobs, no large text fields, no images/files in
   Postgres or Supabase Storage.

### 4.1 Local SQLite (device cache, source of truth for the live UI)

```sql
CREATE TABLE profiles (
  id TEXT PRIMARY KEY,               -- matches Supabase auth.users.id once signed in
  display_name TEXT,
  timezone TEXT,
  default_visual_style TEXT DEFAULT 'pizza',
  streak_count INTEGER DEFAULT 0,
  freezes_available INTEGER DEFAULT 2,
  last_active_date TEXT
);

CREATE TABLE tasks (
  id TEXT PRIMARY KEY,               -- generate as UUID client-side so it matches Supabase's id
  user_id TEXT,                      -- null until signed in / synced
  name TEXT,                        -- optional at input; blank → timestamp title in app
  description TEXT,                  -- optional
  category TEXT,
  predicted_seconds INTEGER NOT NULL,
  actual_seconds INTEGER,
  visual_style TEXT NOT NULL DEFAULT 'pizza',  -- 'pizza' | 'pie' | 'bar' | 'ring'
  started_at INTEGER NOT NULL,       -- unix timestamp
  ended_at INTEGER,
  mood_tag TEXT,                     -- 'too_fast' | 'about_right' | 'dragged_on' | null
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,       -- bumped on every edit; drives delta sync
  synced INTEGER NOT NULL DEFAULT 0  -- 0/1 flag for the local sync queue
);

CREATE TABLE interruptions (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  synced INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE INDEX idx_tasks_user_updated ON tasks(user_id, updated_at);
CREATE INDEX idx_tasks_user_category ON tasks(user_id, category);
```

### 4.2 Supabase (Postgres) — mirrors the local shape

```sql
-- Auto-created on signup via trigger (see 4.3) — never an extra client round-trip
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  timezone TEXT,
  default_visual_style TEXT DEFAULT 'pizza',
  streak_count INTEGER DEFAULT 0,
  freezes_available INTEGER DEFAULT 2,
  last_active_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE tasks (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  description TEXT,                  -- optional; applied via 001 (or 002 on older DBs)
  category TEXT,
  predicted_seconds INTEGER NOT NULL,
  actual_seconds INTEGER,
  visual_style TEXT NOT NULL DEFAULT 'pizza',
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  mood_tag TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE interruptions (
  id UUID PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ
);

CREATE INDEX idx_tasks_user_updated ON tasks(user_id, updated_at);
CREATE INDEX idx_tasks_user_category ON tasks(user_id, category);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE interruptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own profile"
  ON profiles FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users manage their own tasks"
  ON tasks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage their own interruptions"
  ON interruptions FOR ALL
  USING (auth.uid() = (SELECT user_id FROM tasks WHERE tasks.id = task_id))
  WITH CHECK (auth.uid() = (SELECT user_id FROM tasks WHERE tasks.id = task_id));
```

The `ON DELETE CASCADE` + RLS policies together mean: users can never see or touch another
user's rows, and deleting an account automatically wipes their data — cheap to build,
reliable by construction (enforced at the database level, not in app code that could have bugs).

### 4.3 Auto-create profile on signup (no extra client round-trip)

```sql
CREATE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 4.4 Sync pattern (implement as a small `syncService` module)

- **Push:** on task/interruption complete, write locally first (instant UI), set `synced = 0`.
  If online, immediately upsert the row to Supabase and flip `synced = 1`; if offline, leave
  it queued and flush on reconnect or app foreground.
- **Pull:** on login (including a new device) or app foreground, query Supabase for
  `WHERE user_id = auth.uid() AND updated_at > :last_sync_watermark`, merge into local SQLite,
  then update the watermark. Never `SELECT *` a user's whole table on a routine sync.
- **Insights:** computed by querying local SQLite only — never round-trips to Supabase.

### 4.5 What NOT to build (deliberately out of scope, and why)

- **No `insights` table** — insights are cheap arithmetic over `tasks`; storing them just
  adds writes and sync payload for something recomputable client-side for free.
- **No Realtime channels/subscriptions** — this app has no multi-device-at-once or
  multiplayer use case that needs live push; polling on foreground is sufficient and avoids
  holding an open connection per session.
- **No Supabase Storage / file uploads** — nothing in this app needs images or file storage.
- **No materialized views** — a plain SQL view is free to query and has no refresh/write cost;
  a materialized view would add exactly the write overhead this strategy is trying to avoid.

Keep the schema this simple for v1. Category as a free-form/enum-ish string is fine — don't
over-engineer with a separate categories table until there's a real need (custom categories,
colors, etc.).

---

## 5. Build Order (suggested milestones for Cursor)

Use this as the step-by-step implementation checklist. Complete each milestone before moving to the next unless noted.

| Step | Milestone | Status |
|------|-----------|--------|
| 1 | **Scaffold** — `npx create-expo-app` with TypeScript + Expo Router, install core deps (reanimated, svg, gesture-handler, sqlite, zustand, supabase-js). | ✅ (currently on **Expo SDK 54** for Play Store Expo Go compatibility) |
| 2 | **Supabase project setup** — create project, run schema + RLS from §4.2–4.3 (`001`–`003` migrations), enable email and Apple/Google auth providers. | ✅ (`001`+`002` applied on live project; run `003` if not yet; keys in `.env`) |
| 3 | **Timer math core** — timestamp-based elapsed/remaining calculation, unit-tested in isolation before any UI. | ✅ |
| 4 | **Visual timer component** — build the shrinking pie (SVG arc animated via reanimated) as a standalone component with a Storybook-style test screen; then the draining bar variant. | ✅ |
| 5 | **Active Timer screen** — wire the visual component to real timer state, add pause/resume/finish. | ✅ |
| 6 | **Auth screens + guest mode** — sign up/log in flow, session persistence (`supabase.auth.onAuthStateChange`), and the local-only guest path. | ✅ |
| 7 | **New Timer / task setup screen** — predicted duration input, optional name/description, save to local DB on start. | ✅ |
| 8 | **Task complete flow** — capture actual duration + mood, write to SQLite, push to Supabase (or queue if offline/guest). | ✅ |
| 9 | **Sync layer** — background flush of unsynced rows, delta pull-on-login / foreground (`updated_at` watermark). | ✅ |
| 10 | **Home screen** — list + quick-start presets. | ✅ (presets + new timer; recent list still light) |
| 11 | **Calibration/Insights screen** — query local SQLite only, compute rolling stats, render chart. | ✅ (custom bars + insight cards; week/month/all) |
| 12 | **Settings + notifications** — account management, sync status, polish pass. | ✅ (export CSV, delete/clear, milestone notifs + haptics) |
| 13 | **EAS Build** — get a real device build on both platforms early (ideally after step 4 or 5) rather than waiting until the end — animation performance and haptics need real-device testing, not just simulator. | ⬜ |

### Step details

1. **Scaffold** — `npx create-expo-app` with TypeScript + Expo Router, install core deps
   (reanimated, svg, gesture-handler, sqlite, zustand, supabase-js).

2. **Supabase project setup** — create project, run the schema + RLS policy from section 4.2,
   enable email and Apple/Google auth providers in the dashboard.

3. **Timer math core** — timestamp-based elapsed/remaining calculation, unit-tested in
   isolation before any UI.

4. **Visual timer component** — build the shrinking pie (SVG arc animated via reanimated)
   as a standalone component with a Storybook-style test screen; then the draining bar variant.

5. **Active Timer screen** — wire the visual component to real timer state, add
   pause/resume/finish.

6. **Auth screens + guest mode** — sign up/log in flow, session persistence
   (`supabase.auth.onAuthStateChange`), and the local-only guest path.

7. **New Timer / task setup screen** — predicted duration input, save to local SQLite on start.

8. **Task complete flow** — capture actual duration + mood, write to SQLite, push to Supabase
   (or queue if offline/guest).

9. **Sync layer** — background flush of unsynced rows, delta pull-on-login / foreground for
   existing accounts (`updated_at` watermark — see §4.4).

10. **Home screen** — list + quick-start presets.

11. **Calibration/Insights screen** — query local SQLite, compute rolling stats, render chart.

12. **Settings + notifications** — account management, sync status, polish pass.

13. **EAS Build** — get a real device build on both platforms early (step 4 or 5) rather
    than waiting until the end — animation performance and haptics need real-device testing,
    not just simulator.

---

## 6. V1.5 Features — Deepen Core Loop & Reduce Abandonment

Prioritized additions once the core timer + estimator + auth loop is stable. These reinforce
the core mechanic rather than adding new surface area — treat as the next milestone after
section 5's build order, not part of v1.

| Step | Feature | Status |
|------|---------|--------|
| 7.1 | **Learned Defaults** | ✅ (hint on New Timer by name) |
| 7.2 | **Interruption Tracking** | ✅ (pause gaps; insights later) |
| 7.3 | **Home Screen Widget** (Chibi Tabby mood widget, §10) | ⬜ |
| 7.4 | **Re-engagement / Anti-Abandonment** | 🔶 (streaks built, then pulled from UI 2026-09-05 for a redesign — see `docs/BACKLOG.md`; gentle re-entry nudge ✅) |
| 7.5 | **Recurring Routines** (§9) | ✅ |

### 7.1 Learned Defaults

- Once a task name/category has been timed a few times, auto-suggest a predicted duration
  based on the user's own rolling average for that name/category instead of a blank field.
- Removes a decision point exactly when motivation is fragile (the moment right before
  starting a task).
- Data source: query local SQLite `tasks` table for past rows matching the same `name` or
  `category`, average their `actual_seconds`, pre-fill the predicted duration input with it
  (still editable).

### 7.2 Interruption Tracking

- One-tap "got distracted" button visible during an active timer.
- Pauses the timer and logs a gap (start/end timestamp of the interruption) tagged to that
  task session.
- Add a `interruptions` table: `id`, `task_id` (FK), `started_at`, `ended_at`.
- Surface as its own insight over time, separate from duration miscalibration — e.g. "your
  focus sessions average 2.3 interruptions" — shown alongside the existing calibration charts
  in the Insights screen (section 3.5).

### 7.3 Home Screen Widget

Superseded the earlier "live shrinking pie/bar on Lock Screen" concept explored here. The
chosen direction is a **Duolingo-style mascot widget** (chibi cat, mood-state driven by streak
+ today's due Routine) rather than a live-rendered timer visual — see §10 for the full spec.
Kept as the most technically involved v1.5 item since it requires native code outside the
standard Expo managed workflow (config plugins / a custom dev client) — budget more time for
it than the other v1.5 items.

### 7.4 Re-engagement / Anti-Abandonment

> **2026-09-05:** the streak/freeze mechanic described below was built per this spec, then
> pulled from every user-facing surface (Home, Settings, the widget) pending a product
> redesign — the mechanic itself wasn't working out. The algorithm/DB schema are untouched; see
> `docs/BACKLOG.md` → "Deferred: Rethink streaks" for what's kept vs. open for the redesign.
> The gentle re-entry nudge below is unaffected and still live.

- **Forgiving streaks** — a streak counter with a "streak freeze" or grace day so one missed
  day doesn't zero out weeks of momentum. Store `streak_count`, `freezes_available`,
  `last_active_date` in the local `profiles` table (mirrored to Supabase).
- **Gentle re-entry nudge** — if the app hasn't been opened in a few days
  (check `last_active_date` on app foreground or via a scheduled local notification), send a
  single low-pressure notification — e.g. "no worries, want to log just one thing today?" —
  rather than guilt-driven copy. Use `expo-notifications` local scheduled notifications for
  this; no backend push infra needed for v1.5.

  **Implemented:** `lib/reengagementNudge.ts`. Rather than checking `last_active_date` against
  wall-clock time (which needs code to run while the app is closed, which Expo local
  notifications can't do without a background task), it reschedules a single one-time
  notification `REENTRY_NUDGE_DAYS` (3) out from *now* on every cold start/foreground
  (`app/_layout.tsx`), keyed to a fixed identifier so each reschedule replaces the pending one
  instead of stacking. An active user keeps pushing their own nudge further into the future by
  opening the app; it only actually fires once nobody's opened it to reschedule it — same
  idempotent-identifier trick as `ensureLastChanceWidgetTrigger` (§10.5a). Pure date math is
  split into `computeReentryNudgeDate()` for unit testing without mocking
  `expo-notifications`.

---

## 7. Design Notes to Preserve the Core Insight

- The visual timer is the differentiator — don't let it degrade into "a progress bar with a
  label." It should be large, colorful, and occupy most of the screen when active.
- Zero-friction logging is critical for ADHD users — every extra tap before starting a timer
  is a chance to lose the moment of motivation. Task name and category must be optional;
  "just start a timer" should always be one tap away from the home screen.
- Insights should be non-judgmental and framed as useful self-knowledge ("you tend to...")
  rather than criticism ("you're bad at estimating") — tone matters a lot for this audience.

---

## 8. App Icon

**Chosen: Cat Loaf** (was the closing tile of the now-removed daily showcase belt, §3.0).

- Cream loaf silhouette with triangle ears on solid crust-orange; ear inners use crust-dark;
  eyes basil — palette-only, no new hues.
- Interim store assets live in `assets/images/` (`icon.png`, Android adaptive layers, splash);
  replace with final marketing artwork before production store listing.

---

## 9. Recurring Routines (Repeat & Reminders)

A routine is a **task template that repeats on chosen days of the week**, for anywhere from a
few weeks to indefinitely — e.g. "Leg Day" every Friday. Reminders use **native OS repeating
notifications** (not server push), so they can fire even if the app is not reopened.

### 9.1 Data model

Store the recurrence **rule** once — never pre-generate a row per future occurrence. "Due
today?" is computed on-device on Home load (same compute-don't-store pattern as Insights).

Local SQLite: `routines` (with `synced` / `updated_at` for delta sync) + local-only
`routine_notifications` (`routine_id`, `weekday`, `notification_id`). Optional
`tasks.routine_id` links completed sessions for per-routine calibration.

Supabase: mirror `routines` with RLS `auth.uid() = user_id`; add `tasks.routine_id`.
**Never** sync `routine_notifications`.

Weekday storage: `0=Sun..6=Sat` in `recurrence_days`. expo-notifications weekly triggers use
`1=Sun..7=Sat` — convert at schedule time.

### 9.2 Scheduling

One repeating weekly trigger per selected weekday via `expo-notifications`. Cancel /
reschedule on edit, pause, delete, or after `end_date` on next app open (§9.6).

### 9.3–9.5 UI & permissions

- Home: **"Today's Routines"** above Recent; tap pre-fills New Timer; pause/delete on the row.
- New Timer: **Repeat** toggle → days, reminder time, optional end date.
- Request notification permission when Repeat is first enabled (not on cold launch).

### 9.6 End-date edge case

OS triggers do not auto-stop on `end_date`. Cancel mapped notifications the next time the app
opens after that date. One stray reminder if the user never reopens is an accepted v1 limit.

### 9.7 Cost note

Reminders are client-scheduled. Syncing routine **rules** to Supabase is backup/multi-device
only — no Realtime and no push infrastructure.

---

## 10. Home Screen Widget (Chibi Tabby)

> **2026-09-05:** the streak-driven moods described below (`sad`/`happy`/`freeze`, all
> triggered by streak/freeze state) were removed from `lib/widgetSnapshot.ts`'s
> `computeWidgetMood()` — the widget now only reflects today's due Routine, not streak status.
> `widgets/StreakWidget.tsx`'s streak badge was removed too. The widget itself, and the mascot
> art for all 8 moods (`lib/chibiTabbySvg.ts`), are untouched and still render — see
> `docs/BACKLOG.md` → "Deferred: Rethink streaks" for what a redesign might reconnect here.

Duolingo-style home screen widget: a chibi-proportioned cat mascot that reflects streak status
and today's due Routine, in 8 mood states. Design source: `chibi-tabby-widget-design.html`
(visual reference/prototype). Implementation source: `streak-widget-feature-spec.md`. Ties
into the existing streak fields on `profiles` (§4.1/4.2: `streak_count`,
`freezes_available`, `last_active_date`) and the Routines "due today" logic (§9.3).

> **Resolved:** the "Streak Logic" evaluation spec this section's triggers depend on (streak
> reset, freeze consumption, milestone crossing) already exists —
> `docs/concepts/streak-logic-feature-spec.md` / `lib/streakLogic.ts` — it just wasn't
> cross-referenced here yet. See §10.9 for what changed there to support the widget.

### 10.1 Mascot & palette

**Chibi Tabby** — big round chibi head, small body, close-set rounded ears, large expressive
eyes; deliberately softened proportions (short muzzle, close-set ears) to avoid reading as a
wild cat. Production assets use the **existing design tokens** from `constants/theme.ts`
(equivalent to `--crust`, `--crust-dark`, `--basil`, `--sauce`, `--cheese`, `--cream`,
`--board`) — the hex values in the prototype HTML are exploration shortcuts, not a proposal
for a separate widget-only palette. Two colors are held constant regardless of mascot style:
**Last Chance** always uses the sauce-to-board gradient; **Completed** always uses basil.

### 10.2 The 8 states

| State | Mood key | Trigger condition | Task line |
|---|---|---|---|
| Calm | `calm` | Routine due today (§9.3) and reminder time hasn't passed | `<Routine name> · <time>` |
| Reminder | `alert` | Due today, within a configurable window before reminder time (e.g. 3h) and not completed | `Don't forget: <Routine name>` |
| Last chance | `worried` | Due today, within 1–2h of end-of-day/cutoff and not completed | `Streak ends in <N> hours!` |
| Streak lost | `sad` | `streak_count` reset to 1 as of last evaluation | `Start a new streak today` |
| Completed | `completed` | Today's due routine has a matching `tasks` row with `routine_id` set and `ended_at` populated | `<Routine name> — done!` |
| Rest day | `resting` | No routine due today (§9.3 returns no matches) | `No routines today` |
| Freeze saved | `freeze` (renders as `calm` + sparkle) | A freeze was consumed in the most recent streak evaluation — shown for one day only | `A freeze covered yesterday` |
| Milestone | `happy` (+ confetti) | `streak_count` just crossed a 7-day multiple — shown for one day only | `<N>-day streak!` |

All state logic reuses existing data (`profiles` streak fields + the §9.3 "due today" query).
**No new database tables are needed for the widget itself.**

### 10.3 Sizes

- **Small** — streak count only, mood-appropriate icon.
- **Medium** — streak count + task line + subtitle.

Both sizes reuse the same mascot illustration, scaled — no separate artwork per size.

### 10.4 Illustration delivery: static assets, not live drawing

iOS WidgetKit (SwiftUI, separate extension process) and Android Glance/`AppWidgetProvider`
are both far more constrained than the app's own UI — arbitrary custom SVG drawing/animation
like the prototype isn't a good fit. Export each of the 8 mood states as a **static image
asset** (PNG or rasterized SVG) at required resolutions, generated once from the illustration
source — not drawn programmatically inside the widget extension. The prototype's live
blink/animation is a preview device only; widgets refresh on a timeline (§10.6), they don't
run a live animation loop.

### 10.5 Data contract: app → widget

Widget extensions run in a separate process and can't query the app's RN runtime or SQLite
directly. The main app writes a small denormalized snapshot to a shared location whenever
something relevant changes (task completes, routine due-status changes, streak evaluation
runs):

- **iOS** — App Group shared container (small JSON/plist file).
- **Android** — `SharedPreferences` or a small file readable by the widget provider.

```json
{
  "mood": "calm",
  "streakCount": 5,
  "routineName": "Leg Day",
  "reminderTime": "18:00",
  "taskLine": "Leg Day · 6:00 PM",
  "subLine": "Plenty of time"
}
```

Keep the snapshot tiny and pre-computed — the widget never runs "due today" or streak math
itself; the main app computes mood + text once and the widget just renders it, same
compute-don't-store pattern as Insights (§3.6) and Routines (§9.1).

### 10.5a Implementation status (Android)

Data layer + Android widget UI are built: `lib/widgetSnapshot.ts` (pure `computeWidgetMood` +
persistence via `writeWidgetSnapshot`/`readWidgetSnapshot`), `widgets/StreakWidget.tsx` +
`widgets/widgetTaskHandler.ts` (using `react-native-android-widget`), wired into task-complete,
cold start, and every routine mutation.

- **Mascot is the real Chibi Tabby design**, not a static PNG export — `lib/chibiTabbySvg.ts`
  ports `drawChibiTabby()`/`drawDecoration()` from `chibi-tabby-widget-design.html` into SVG
  markup (theme.ts tokens, not the prototype's own hex values), rendered natively via
  `SvgWidget` from `react-native-android-widget`. This intentionally departs from §10.4's
  "static PNG, not live drawing" recommendation — SVG-string rendering turned out to be
  supported and avoids needing a separate art-export pass, at the cost of one static frame per
  mood (no blink) rather than a rasterized asset.
- **Both mood-transition triggers are wired.** Reminder: piggybacked on the routine's existing
  reminder notification firing (`Notifications.addNotificationReceivedListener` in
  `app/_layout.tsx`) — free, no new schedule. Last Chance: a dedicated once-daily silent local
  notification (`ensureLastChanceWidgetTrigger()` in `lib/widgetSnapshot.ts`, fired at 22:00,
  scheduled idempotently on cold start) recomputes the widget without alerting the user —
  `lib/timerFeedback.ts`'s shared `Notifications.setNotificationHandler` now checks
  `data.widgetSilent` to suppress the banner/sound for it specifically, leaving all other
  notification types (timer milestones, routine reminders) unaffected.

iOS WidgetKit is not built (§10.9 dependency: no Mac in the current dev environment). On-device
Android verification (the manual walkthrough this section's build plan called for) hasn't run
either — no emulator/device available in the environment this was built in.

### 10.6 Scheduling transitions (app-closed problem)

Widgets can't refresh live — iOS enforces a daily refresh budget (roughly 40–70/day, i.e.
every 15–60 min) with no guaranteed exact timing. Same fix as Routines' notifications: don't
rely on a live trigger, schedule transitions in advance.

- When due-today status is established (midnight rollover or app foreground), compute that
  day's mood transition times (Calm → Reminder → Last Chance) from the routine's
  `reminder_hour`/`reminder_minute`.
- Write multiple future timeline entries (iOS: multiple `TimelineEntry` values; Android:
  schedule next update via `WorkManager`/`AlarmManager` per transition) rather than one
  "current state" entry.
- Reload policy: refresh once the last scheduled entry's time passes, or immediately when the
  main app writes a new snapshot (e.g. routine completed → jump straight to Completed instead
  of waiting out the timeline).

### 10.7 Tap behavior

Deep-links to the same destination as a Routine notification tap (§9): pre-filled New Timer
for that day's due routine. If no routine is due (Rest Day), tapping opens Home instead.

**Implemented**, both surfaces share one destination: `app/timer/new.tsx` accepts an optional
`routineId` param and resolves it (via `getRoutineById`) into name/predicted-minutes/category/
visual-style on mount, rather than either caller pre-computing those fields itself.

- **Widget tap** — `WidgetSnapshot.dueRoutineId` (paired with `routineName`, set in every
  branch of `computeWidgetMood`) lets `widgets/StreakWidget.tsx` build an `OPEN_URI` click
  action to `${scheme}://timer/new?routineId=...` when a routine is due; falls back to
  `OPEN_APP` (opens Home) on a Rest Day or if the app scheme isn't resolvable.
- **Routine notification tap** — `rescheduleRoutineNotifications` now attaches
  `data: { routineId }` to the scheduled notification content. `app/_layout.tsx` listens with
  `Notifications.addNotificationResponseReceivedListener` (plus
  `getLastNotificationResponseAsync` for the cold-start case — app was closed, tap launched
  it) and routes to `/timer/new?routineId=...` when present.
- Home's own due-routine cards (`RoutineCard` in `app/(tabs)/index.tsx`) were switched to the
  same `routineId` param instead of building the prefill fields inline, so there's one prefill
  code path instead of three.

### 10.8 Decorations

Sparkle (Freeze Saved) and confetti (Milestone) are small decorative overlays for those two
states, not a separate animation layer. Implemented as static SVG paths within
`lib/chibiTabbySvg.ts`'s per-mood markup (see §10.5a) rather than baked into a raster asset.

### 10.9 Open questions (not yet decided)

- Multiple routines due the same day — show nearest-upcoming, or a count? Leaning
  nearest-upcoming (a widget is glanced at, not read carefully), not finalized.
- Exact hour windows for Calm → Reminder → Last Chance transitions ("3 hours before",
  "1–2 hours before" are placeholders).
- ~~The Streak Logic evaluation spec itself~~ — resolved: it already existed at
  `docs/concepts/streak-logic-feature-spec.md` / `lib/streakLogic.ts`, just wasn't
  cross-referenced from here. `applyStreakOnTaskComplete()` now also returns a `reset` flag,
  added specifically so the widget's Streak Lost state (§10.2) is derivable without a new
  stored flag — see `lib/widgetSnapshot.ts`'s `streakLostToday()`.
- ~~Last Chance's own scheduled widget-refresh trigger~~ — resolved, see §10.5a.
