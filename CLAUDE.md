# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

TimeSense — an ADHD-friendly timer app (React Native + Expo). Two core mechanics: a bespoke
full-screen visual timer (default "Eating Pizza"; also pie/plant/moon/monk/cat) instead of a
digit countdown, and a time-cost estimator that logs predicted vs. actual duration to build a
personal calibration history. Product + tech source of truth is `BUILD_SPEC.md` — read it
before any non-trivial change; it defines the data model, sync rules, and build-order status
table.

## Commands

```bash
npm install
cp .env.example .env.development   # EXPO_PUBLIC_SUPABASE_URL + EXPO_PUBLIC_SUPABASE_KEY (or _ANON_KEY)
npx expo start                     # dev server (Expo Go or dev client)
npm run android / npm run ios      # native run via Expo
npm test                           # Jest, all tests
npx jest lib/__tests__/routineLogic.test.ts   # single test file
npx jest -t "isDueOnDate"          # filter by test name
npx tsc --noEmit                   # typecheck (no separate lint script configured)
```

Guest/offline mode works with no Supabase keys configured; cloud auth and sync need a real
project. `APP_ENV` (`development` | `preview` | `production`) selects bundle ID / URL scheme
in `app.config.js` — defaults to `development`.

New native config plugins (e.g. a date picker) must be installed with `npx expo install
<pkg>` (not plain npm install) to get an SDK-compatible version, and registered in the
`plugins` array of `app.config.js`.

## Architecture

**Local-first, cost-conscious sync** (`.cursor/rules/local-first-cost-strategy.mdc`,
BUILD_SPEC §4): `expo-sqlite` (`lib/tasksDb.ts`, `lib/routinesDb.ts`) is what every screen
reads/writes — Supabase is a backup/sync target, never a dependency for rendering. On native
this uses real SQLite; in Expo Go / web it falls back to AsyncStorage-backed JSON blobs (see
the `useAsync` / `getSqlite()` branches in those files) — new local-data functions must
support both paths the same way. Rules that follow from this:

- **Delta sync only** — `lib/syncService.ts` pulls `WHERE updated_at > watermark` per table
  (tasks, interruptions, routines, profile), never a full refetch. Push-on-write sets
  `synced = 0` then flips to `1` after a successful Supabase upsert; offline writes stay
  queued and flush on reconnect/foreground via `syncNow()`.
- **No Realtime subscriptions** — single-user app, plain pull-on-foreground / push-on-write.
- **Insights are never stored or synced** — `lib/insightsStats.ts` computes rolling
  `(actual - predicted) / predicted` per category entirely from local SQLite.
- Mapping between local camelCase rows and Supabase snake_case rows lives in
  `lib/syncMappers.ts` — extend it (not ad-hoc mapping in call sites) when a synced table
  changes shape. `supabase/migrations/*.sql` are applied in numeric order per environment;
  the current head is `007_routines.sql`.

**Timer math is timestamp-based, not interval-based**: elapsed/remaining is always
`now - startTimestamp` (plus pause bookkeeping), so the timer stays correct across
backgrounding — see `lib/timerMath.ts` and `stores/activeTimerStore.ts`. Never reintroduce a
"just count down every tick" implementation.

**Visual timer styles** are separate bespoke components under `components/timer/`
(`EatingPizza`, `ShrinkingPie`, `DrainingBar`, `DrainingRing`, `GrowingPlant`, `MoonArc`,
`BanyanMonk`, `CatLoaf`), each taking the same progress prop shape and switched on by
`VisualStyle` in `types/task.ts`; `components/timer/VisualTimer.tsx` is the dispatcher. Adding
a new style means adding a component here, a `VisualStyle` union member, and an entry in
`STYLE_OPTIONS` (`constants/theme.ts`) — not branching inline elsewhere.

**Design tokens**: `constants/theme.ts` (`colors`, `fonts`, `STYLE_OPTIONS`,
`CATEGORY_OPTIONS`) is the only source of colors/typography — don't inline hex values or font
names in screens. Shared primitives live in `components/ui/` (`TsButton`, `TsCard`, `TsChip`,
`TsSectionLabel`); reuse/extend these over new one-off styled components.

**Routines** (recurring task templates, BUILD_SPEC §9): the rule is stored once
(`routines` table) and "due today" is computed on-device on Home load — never pre-generate
per-occurrence rows, same compute-don't-store pattern as Insights. `lib/routineLogic.ts` is
pure date/weekday logic (unit-tested, no I/O); `lib/routinesDb.ts` is local persistence +
sync queue; `lib/routineNotifications.ts` schedules/cancels the actual `expo-notifications`
weekly OS reminders and is the only place that should touch `Notifications.*` for routines.
`routine_notifications` (the local notification-ID map) is device-local and must never be
synced to Supabase. OS triggers don't self-cancel on `end_date` — `app/_layout.tsx` calls
`cancelExpiredRoutineNotifications()` once on cold start to sweep those up.

**State**: Zustand stores in `stores/` (`activeTimerStore` for the running timer,
`authStore` for Supabase session + guest mode) — prefer extending these over adding new
global state containers.

**Routing**: Expo Router (file-based, `app/`), typed routes enabled. `app/(tabs)/` is the
main tab group (Home/Insights/Settings); `app/timer/` holds the new/active/complete timer
flow as stack screens outside the tabs.

## Working conventions

From `.cursor/rules/`:

- **Reuse before writing** — check for an existing internal utility or an already-installed
  dependency before adding new code or a new package; prefer a well-maintained package over
  hand-rolling things like date handling, UUIDs, retries, validation. State briefly what you
  checked when proposing new code.
- **Zero-friction product constraint** — task name/category stay optional everywhere; the
  predicted-duration input should be a big stepper/number picker, not a small text field;
  starting a timer must stay one tap from Home.
- **Insights tone** — always framed as self-knowledge ("you tend to...") never criticism;
  keep the stats deterministic, not AI-generated.
- **Visual timer stays the product** — full-screen, bespoke SVG/reanimated, no digital
  countdown by default (opt-in MM:SS toggle only), color-shifts as time runs low.
