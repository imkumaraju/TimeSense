# TimeSense — ADHD Time-Blindness App
### Build Spec for Cursor

## 1. Concept

An app that helps people with ADHD *feel* time passing instead of reading it, and builds
a personal calibration history between predicted vs. actual task duration.

Two core features:
1. **Visual/Analog Timer** — time shown as a shrinking pie or draining color bar, not digits.
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
- `react-native-reanimated` (v3) — for smooth 60fps timer animations (shrinking pie, draining bar).
- `react-native-svg` — to draw the pie/arc/bar shapes.
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
Supabase in the background:
- On task complete (write), push the row to Supabase immediately if online, else queue it
  (a simple `synced` boolean column) and flush the queue on reconnect/app foreground.
- On login (including a fresh install/new device), pull all rows for `auth.uid()` from
  Supabase into local SQLite.
- This gives offline-first reliability plus cross-device backup — the whole point of
  "preserve the data somewhere cheap and reliable" without making the live timer depend on
  network latency.

**Testing:** Jest + React Native Testing Library for logic (especially the elapsed-time
math and estimator statistics).

**Build/Deploy:** EAS Build (Expo Application Services) for iOS/Android binaries, EAS
Submit for store submission.

---

## 3. Core Screens

### 3.0 Daily Open — Style Showcase
- Shown on the **first app open of each local calendar day** (AsyncStorage
  `timesense.showcase.last_shown_date` = device-local `YYYY-MM-DD`). Same-day reopens skip it.
- A horizontal, auto-playing conveyor of timer-style icons (Radial → Slices → Plant → Moon →
  Sky → Garden → Monk → **Cat Loaf**) scrolling once right→left (~4.5s), then auto-advancing
  to **Home**. Skip is always available. Does not force Sign Up on every daily open.
- **Closing icon:** Cat Loaf — the chosen app icon (Section 8) — so the last tile matches the
  home-screen mark (cream loaf + crust-dark ear shading + basil eyes on `--crust`).
- Purpose: remind that the app has multiple timer styles in a few seconds of motion.
- Full interaction and motion spec: `docs/concepts/first-launch-showcase.html` +
  `docs/concepts/first-launch-showcase.md`.

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
- "Today's Routines" section (see Section 9.3) sits above Recent once Routines exist.

### 3.3 New Timer / Task Setup
- Task name (optional — allow fully anonymous "just start a timer" for zero-friction use).
- Predicted duration input (this is the "time cost estimator" prediction step) — big, fast
  number picker, not a tiny text field.
- Timer visual style toggle: Shrinking Pie / Draining Bar / Draining Circle-ring.
- Category tag (optional): Chores, Work, Study, Errands, Creative, Other — used later for
  calibration analytics.
- "Repeat" toggle (see Section 9) — turns this task into a recurring Routine instead of a
  one-off timer.

### 3.4 Active Timer (the core screen)
- Full-screen visual: pie/bar/ring shrinking in real time, color shifting (e.g. green →
  yellow → red as time runs low) for extra sensory feedback.
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

*Note: the `routines` and `routine_notifications` tables (Section 9.1) follow this same
schema style and RLS pattern; they're defined alongside that feature rather than here to
keep this section focused on the v1 core. Sync `routines` like `tasks`; never sync
`routine_notifications` (device-local notification IDs).*

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
  default_visual_style TEXT DEFAULT 'pie',
  streak_count INTEGER DEFAULT 0,
  freezes_available INTEGER DEFAULT 2,
  last_active_date TEXT
);

CREATE TABLE tasks (
  id TEXT PRIMARY KEY,               -- generate as UUID client-side so it matches Supabase's id
  user_id TEXT,                      -- null until signed in / synced
  name TEXT,
  category TEXT,
  predicted_seconds INTEGER NOT NULL,
  actual_seconds INTEGER,
  visual_style TEXT NOT NULL DEFAULT 'pie',
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
  default_visual_style TEXT DEFAULT 'pie',
  streak_count INTEGER DEFAULT 0,
  freezes_available INTEGER DEFAULT 2,
  last_active_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE tasks (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  category TEXT,
  predicted_seconds INTEGER NOT NULL,
  actual_seconds INTEGER,
  visual_style TEXT NOT NULL DEFAULT 'pie',
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
9. **Sync layer** — background flush of unsynced rows, pull-on-login for existing accounts.
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

### 6.1 Learned Defaults
- Once a task name/category has been timed a few times, auto-suggest a predicted duration
  based on the user's own rolling average for that name/category instead of a blank field.
- Removes a decision point exactly when motivation is fragile (the moment right before
  starting a task).
- Data source: query local SQLite `tasks` table for past rows matching the same `name` or
  `category`, average their `actual_seconds`, pre-fill the predicted duration input with it
  (still editable).

### 6.2 Interruption Tracking
- One-tap "got distracted" button visible during an active timer.
- Pauses the timer and logs a gap (start/end timestamp of the interruption) tagged to that
  task session.
- Add a `interruptions` table: `id`, `task_id` (FK), `started_at`, `ended_at`.
- Surface as its own insight over time, separate from duration miscalibration — e.g. "your
  focus sessions average 2.3 interruptions" — shown alongside the existing calibration charts
  in the Insights screen (section 3.6).

### 6.3 Lock-Screen / Widget Timer
- iOS: build with **WidgetKit** via Expo's config plugin support (or an Expo dev client with
  a native WidgetKit target) — shows the live shrinking pie/bar on the Lock Screen and Home
  Screen widget gallery, updating via `TimelineProvider`.
- Android: equivalent via **Jetpack Glance** or a native `AppWidgetProvider`, exposed through
  a similar Expo config plugin / native module.
- High value here because the core premise of the app is *ambient* time awareness — the
  widget lets the visual be glanceable without opening the app at all.
- Note: this is the most technically involved v1.5 item since it requires native code outside
  the standard Expo managed workflow (a custom dev client or EAS Build with config plugins) —
  budget more time for it than the other two.

### 6.4 Re-engagement / Anti-Abandonment
- **Forgiving streaks** — a streak counter with a "streak freeze" or grace day so one missed
  day doesn't zero out weeks of momentum. Store `streak_count`, `freezes_available`,
  `last_active_date` in the local `settings`/user table.
- **Gentle re-entry nudge** — if the app hasn't been opened in a few days
  (check `last_active_date` on app foreground or via a scheduled local notification), send a
  single low-pressure notification — e.g. "no worries, want to log just one thing today?" —
  rather than guilt-driven copy. Use `expo-notifications` local scheduled notifications for
  this; no backend push infra needed for v1.5.

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

**Chosen: Cat Loaf** (Concept 08 from the App Icon Concepts doc).

- A rounded loaf-shaped cat silhouette (cream) with two triangle ears on a solid crust-orange
  background — built entirely from the app's existing palette, no new colors introduced.
- Selected for two reasons: it stays legible as a bold, simple silhouette at true icon sizes
  (tagged "Works small" in the concepts doc), and it's distinctive/memorable in a way a more
  literal timer motif (pizza slice, hourglass) isn't — it doesn't look like every other
  productivity or timer app on the home screen.
- Colors: background `--crust`; loaf body `--cream`; ear shading `--crust-dark`; eyes `--basil`.
- Deliver as a standard icon set (1024×1024 master, iOS/Android adaptive sizes) once final
  artwork is produced — the concepts doc version is a flat-design placeholder suitable for
  early builds and store listing drafts, not final production art.

---

## 9. Recurring Routines (Repeat & Reminders)

A routine is a **task template that repeats on chosen days of the week**, for anywhere from a
few weeks to indefinitely — e.g. "Leg Day" every Friday, "Biceps Day" every Wednesday. The
reminder must fire **even if the user never opens the app again** after setting it up, so this
is built on native OS-level repeating notifications, not anything server-driven.

### 9.1 Data model

Store the recurrence **rule** once — never pre-generate a row per future occurrence. "Is this
due today?" is computed on-device each time Home loads, the same "compute, don't store"
approach already used for Insights.

```sql
-- Local SQLite
CREATE TABLE routines (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  name TEXT,                    -- "Leg Day"
  category TEXT,
  predicted_seconds INTEGER,    -- default estimate, still editable per session
  visual_style TEXT,
  recurrence_days TEXT,         -- comma-separated weekday ints, e.g. "5" for Friday (0=Sun..6=Sat)
  reminder_hour INTEGER,
  reminder_minute INTEGER,
  start_date TEXT,
  end_date TEXT,                 -- null = ongoing indefinitely
  active INTEGER DEFAULT 1,      -- lets you pause without deleting
  created_at TEXT,
  updated_at TEXT,
  synced INTEGER DEFAULT 0
);

-- Maps each routine to its scheduled native notifications, so they can be found/cancelled later
CREATE TABLE routine_notifications (
  routine_id TEXT NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  weekday INTEGER NOT NULL,
  notification_id TEXT NOT NULL   -- the ID expo-notifications returns
);
```

Add an optional `routine_id` column to the existing `tasks` table (both local and Supabase).
When a routine's session is actually completed, it creates a normal `tasks` row linked back to
its routine — so predicted-vs-actual calibration insights work **per routine** for free
("your Leg Day sessions run about 12 minutes over") with no extra logic needed.

Mirror the `routines` table structure in Supabase (same RLS pattern as `tasks` —
`auth.uid() = user_id`) so routines sync across devices like everything else.
`routine_notifications` stays **local-only** — notification IDs are meaningless outside the
device that scheduled them, so this table is never synced.

### 9.2 Scheduling — native repeating triggers, not a rolling window

Both iOS and Android support a **repeating calendar trigger** at the OS level — "fire every
week on this weekday at this time" — as a single scheduled entry. Once scheduled, the OS
fires it indefinitely with **zero app involvement required afterward**, which is what makes
"remind me even if I never reopen the app" actually work.

```js
import * as Notifications from 'expo-notifications';

await Notifications.scheduleNotificationAsync({
  content: { title: "Leg Day", body: "Time for Leg Day." },
  trigger: {
    type: SchedulableTriggerInputTypes.WEEKLY,
    weekday: 6,      // Friday (1=Sun..7=Sat in expo-notifications)
    hour: 9,
    minute: 0,
    repeats: true,   // OS repeats this natively — no app process needed
  },
});
```

For a routine spanning multiple days (e.g. Mon/Wed/Fri), schedule **one repeating trigger per
selected weekday** rather than one complex multi-day trigger — save each returned notification
ID into `routine_notifications` so it can be cancelled if the routine is edited, paused, or
its end date passes.

Convert stored weekdays (`0=Sun..6=Sat`) to expo-notifications (`1=Sun..7=Sat`) when scheduling.

### 9.3 "Due today" logic (Home screen)

On Home screen load, for each `active` routine: check whether today's weekday appears in
`recurrence_days`, and today falls within `[start_date, end_date]` (or `end_date` is null).
Matches render in a new **"Today's Routines"** section on Home, above the existing "Recent"
list. Tapping one pre-fills New Timer with that routine's name, category, and predicted
duration — one tap from there to Start. Pause/delete from the due-today row so reminders can
be stopped without a separate manage screen.

### 9.4 UI touchpoints

- **New Timer setup** — add a "Repeat" toggle. Enabling it reveals a multi-select day-of-week
  picker, a reminder time picker, and an optional end date (defaults to no end date / ongoing).
- **Home** — new "Today's Routines" section above "Recent," populated by the logic in 9.3.

### 9.5 Notification permissions

Request notification permission **the moment the user first enables Repeat on a routine** —
not proactively on app launch. Asking at the point of clear intent (they're actively setting
up a reminder) gets meaningfully better opt-in rates than asking cold at first open.

### 9.6 Known edge case: end dates aren't natively enforced

OS repeating triggers don't take a "stop after this date" parameter — they repeat until
explicitly cancelled by the app. So a routine with an `end_date` needs the app to cancel its
`routine_notifications` entries the next time it opens **after** that date. Practical
consequence: if someone sets an end date and then never reopens the app again, they could
receive one stray reminder past that date. This is an acceptable v1 limitation rather than
something worth engineering around (e.g. no need for background task infrastructure just to
close this small gap).

### 9.7 Cost/architecture note

Reminders are **client-scheduled** (local OS notifications), not server-triggered push — no
Expo push tokens or Realtime. The `routines` **rule** rows still delta-sync via Supabase like
tasks (backup / multi-device); only `routine_notifications` stay device-local.
