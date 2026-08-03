# Streak & Freeze Logic — Feature Spec

Part of the V1.5 "Re-engagement / Anti-Abandonment" feature set (see the main build spec,
Section 6.4). This doc covers just the streak mechanic in enough detail to implement directly.

## 1. Goal

Reward consecutive days of task completion without creating all-or-nothing pressure. A single
missed day should be forgivable — otherwise a streak becomes a source of guilt and abandonment
instead of motivation, which is the opposite of what this app is for.

## 2. What counts as "keeping the streak alive"

A day only counts as active when the user **completes at least one task** (saves it on the
Task Complete screen) — not merely opening the app. Tying it to task completion instead of app
open keeps the streak meaningful rather than trivially gameable.

## 3. Data

Already present on the `profiles` table (local SQLite and Supabase, per the Data Model spec):

```sql
streak_count INTEGER DEFAULT 0,
freezes_available INTEGER DEFAULT 2,
last_active_date TEXT   -- SQLite: 'YYYY-MM-DD' / Supabase: DATE
```

## 4. When it's evaluated

Only at the moment a task is saved (Task Complete → Save). Not on app foreground, not on
timers starting — evaluating anywhere else risks double-counting or counting a day as active
before the user has actually done anything.

## 5. Core algorithm

Compare `last_active_date` to the device's current **local calendar date** (not a rolling
24-hour window):

```
daysSinceLastActive = today - last_active_date   // in calendar days

if daysSinceLastActive == 0:
    // already logged activity today — no-op
    do nothing

else if daysSinceLastActive == 1:
    // yesterday was active, today continues the streak
    streak_count += 1
    last_active_date = today

else if daysSinceLastActive == 2 and freezes_available > 0:
    // exactly one day was missed — spend a freeze to bridge the gap
    freezes_available -= 1
    streak_count += 1
    last_active_date = today

else:
    // gap too large, or no freeze available to cover it
    streak_count = 1
    last_active_date = today
```

The freeze branch is the important one: it only forgives a **single** missed day, and only if
a freeze is banked. A two-day gap, or a one-day gap with zero freezes left, resets to 1.

## 6. Earning freezes

Freezes need an earning mechanism, or they're either infinite (meaningless) or a one-time
grant (useless after first use):

- **+1 freeze at every 7-day streak milestone**, capped at **2 banked freezes** at a time.
- This ties the safety net to the behavior it's protecting — a longer streak earns more slack
  to protect itself, reinforcing the habit rather than being a disconnected monthly allowance.

## 7. Where this runs

Entirely **on-device**, against the local `profiles` row, at the moment a task is saved.
The updated `streak_count` / `freezes_available` / `last_active_date` then sync to Supabase
like any other profile field via the existing delta-sync pattern — no server-side cron job or
edge function needed for logic this simple.

## 8. Edge cases (decided now, not discovered later)

- **Timezone travel** — "today" can shift mid-trip. For v1, just use whatever the device
  reports as local calendar date at evaluation time; a rare lost/duplicated streak day from
  travel isn't worth complex handling.
- **Multiple tasks in one day** — only the first completed task of the day matters; the
  `daysSinceLastActive == 0` no-op branch already handles any tasks after that for free.
- **Offline gaps** — works unchanged, since evaluation is local against local SQLite state,
  not against a server timestamp.

## 9. UI touchpoints

- **Home screen** — streak badge (e.g. "🔥 5-day streak"), per the New Timer / Home mockups
  already in the screen-flow doc.
- **Settings** — could optionally surface `freezes_available` so the mechanic isn't a total
  black box to the user (e.g. "2 streak freezes available").
- **Re-entry nudge** (separate V1.5 feature, Section 6.4) — if `daysSinceLastActive >= 2` on
  app foreground, this is the trigger condition for the gentle low-pressure notification. The
  nudge and the streak algorithm are related but separate: the nudge is read-only and can fire
  on app foreground, while the streak mutation only ever happens on task save.
