# Feature: Timer Theme Animations (Intro / Loop / Outro Video Segments)

> Supersedes the continuous-seek model in `feature-timer-theme-video-scrub.md` entirely.
> Both video-scrub themes (`monk`, then `plant`) are on this model as of 2026-08-23 — `plant`
> was migrated with a newly-authored portrait 9:16 source video once the old landscape asset
> was replaced. `VideoScrubTimer.tsx` and the old `TimerThemeConfig`/`timingCurve` types have
> been deleted; `lib/timerThemes.ts` now only exports `SegmentThemeConfig`/`segmentThemes`.

## Summary
Replace continuous playhead scrubbing with a themed video animation structured as three
segments — a fixed-length **intro**, a seamlessly-**looping** middle section, and a
fixed-length **outro** — that together cover any timer duration from ~1 second to ~24 hours.
Theme-agnostic mechanism; only the source video and its segment boundaries change per theme.

Two themes on this model: **monk** (`assets/timer-themes/monk/monk.mp4`, replacing the SVG
`BanyanMonk` rendering) and **plant** (`assets/timer-themes/plant/plant.mp4`, migrated from the
old continuous-scrub model). Both are 720×1280 portrait (9:16), 10.006s, ~2.5-2.6MB — probed
via mp4 `mvhd`/`tkhd` boxes — and were generated from matching intro/loop/outro-structured
prompts (walk-in/sit/eyes-close vs. seed/sprout/closed-bud for 0-2s; stillness vs.
bud-breathing-anticipation for 2-8s; eyes-open/stand/walk-out vs. bud-opens-to-bloom for 8-10s).

Example (10s source video): 0–2s = intro (monk walks into frame, sits, closes eyes), 2–8s =
loop (meditating, eyes closed — repeats for however long the timer runs), 8–10s = outro (opens
eyes, stands, walks out of frame). The loop repeats to fill however much time the timer needs;
intro and outro always play exactly once, at the start and end of the session.

**Monk's segment boundaries are confirmed** — `introEndMs: 2000` / `loopStartMs: 2000` /
`loopEndMs: 8000` / `outroStartMs: 8000` match the video's actual generation prompt: walk-in →
sit → eyes-close at 0-2s, seamless-loop stillness/meditating at 2-8s, eyes-open → stand →
walk-out at 8-10s.

## Background
The earlier approach scrubbed the video's playhead continuously via `seek()`, computing a
target position from a progress-based timing curve on every tick. In practice this causes
visible lag/stutter — frequent seeking is expensive (each seek forces the decoder to locate the
nearest keyframe and decode forward), and doing it many times per minute (more on short timers)
is a poor fit for smooth playback.

The intro/loop/outro segment model replaces that entirely. Instead of computing a position and
seeking to it continuously, the video mostly just **plays natively**: intro plays once, the
loop segment repeats via native playback with only an occasional seek back to the loop's start
point, and the outro plays once at the end. This is both smoother (native playback is what
decoders are optimized for) and simpler (no progress-ratio timing curve, no per-tick position
math, no separate handling needed for the 1-second-to-24-hour duration range — the loop just
repeats as many times as it needs to).

## Goals
- Smoothly animate a themed video across the life of a timer session, using an authored source
  video split into intro/loop/outro segments.
- Fix the seek-driven lag from the previous scrubbing approach by minimizing `seek()` calls to
  only segment-boundary transitions.
- Handle timer durations ranging from ~1 second to ~24 hours without per-duration
  special-casing — the loop segment absorbs all of it.
- Segment boundaries are backend/config-only — never exposed to end users.
- Adding a new theme on this model = a config entry + dropping the video asset — no changes to
  the playback component itself.

## Non-goals
- No runtime video generation or AI calls during playback.
- No user-facing controls or settings for segment timing.
- Not building a general-purpose video player; playback is driven by timer state
  (running/paused/finishing), not user scrubbing.

## Segment Model
```
0ms                  introEndMs                              loopEndMs   videoDurationMs
|---------intro---------|------------------loop (repeats)------------------|-------outro-------|
                    (= loopStartMs)                      (outroStartMs =)
```
- **Intro** (`0` → `introEndMs`): plays once, in full, when the timer starts.
- **Loop** (`loopStartMs` → `loopEndMs`): plays natively, repeats via seek-back-to-`loopStartMs`
  each time it reaches `loopEndMs`. No per-tick seeking.
- **Outro** (`outroStartMs` → `videoDurationMs`): plays once, in full, triggered when the timer
  reaches its final `outroDurationMs` of remaining time (or immediately on manual Finish).

`loopStartMs` typically equals `introEndMs`, `outroStartMs` typically equals `loopEndMs`, kept
as separate fields in case a theme wants a short non-looped transition frame.

## Source Aspect Ratio & Cross-Device Cropping Safety
The full-screen immersive layout (`feature-fullscreen-immersive-timer.md`) renders video with
`contentFit="cover"`, which always fills the screen edge-to-edge — but "fill" means crop, since
device aspect ratios vary widely.

**Recommended source aspect ratio: 9:16 portrait (e.g. 1080×1920).** Real device portrait
ratios (width/height) span roughly tablets ~0.75, typical phones ~0.5625, tall modern phones
~0.45–0.46 — 9:16 sits near the middle, minimizing worst-case crop at either extreme.

**Subject safe zone** (more important than the exact ratio): with `cover`, short/wide devices
(tablets) crop top/bottom, tall narrow phones crop left/right. Keep the essential subject
action within the center ~85% of frame width and center ~75-80% of frame height — don't frame
key motion (a face, a gesture) near the very top/bottom/edges, or some device won't show it.
Authoring-time concern only, no runtime code needed beyond `contentFit="cover"` itself, which
already applies. Assumes portrait-only orientation (matches this app's locked portrait
`app.config.js`).

> **Resolved 2026-08-23.** The original draft asset (`ok_now_build_me_a_videos_where.mp4`,
> 1280×720 landscape) was replaced with `monk.mp4` — 720×1280 portrait (9:16), matching this
> guidance. `lib/timerThemes.ts`'s `monkTheme.videoSource` now points at it.

## Playback Behavior
| Event | Behavior |
|---|---|
| Timer starts | Seek to `0`, `play()`. Intro plays natively, no further seeking during it. |
| Intro finishes | Continue into loop natively (no seek if `loopStartMs === introEndMs`); else one seek to `loopStartMs`. |
| Loop reaches `loopEndMs` | Seek back to `loopStartMs`, `play()`. Only seek that repeats, once per loop cycle. |
| Remaining time reaches `outroDurationMs` | Let current loop cycle finish naturally; at its `loopEndMs`, seek to `outroStartMs` instead of `loopStartMs`, play through to the end. |
| Pause | Native `pause()` at current position, no seeking. |
| Resume | Native `play()` from paused position. |
| "Got distracted" | Seek back to `loopStartMs` + brief desaturation dip (~40% saturation, ~800ms total cue), resume loop. |
| +5 min / time extended | Recompute outro trigger point; if outro already started, let it finish, re-enter loop after if time remains. |
| Finish (natural) | Outro reaches its natural end exactly as countdown hits zero. |
| Finish (manual/early) | Immediately seek to `outroStartMs`, play through to the end. |

## Variable Duration Handling
Loop repeats for as long as needed — no progress-ratio curve, no tiered update-frequency logic.
Only constraint: the existing **1-minute minimum timer length** must stay comfortably above
`introDurationMs + outroDurationMs` for every theme on this model (ideally margin for 1-2 loop
cycles), a content-authoring-time check, not a runtime fallback.

## Rendering Approach (React Native / expo-video)
- `expo-video`'s `useVideoPlayer` + `player.currentTime` for seeks (same primitives as
  `VideoScrubTimer.tsx`), driving transitions off the player's `timeUpdate` event
  (`player.timeUpdateEventInterval` set short, e.g. 0.25s) rather than a separate app timer
  loop.
- Only `seek()` calls in normal operation: session start (`0`), once per loop cycle (back to
  `loopStartMs`), once to enter the outro (`outroStartMs`), once on "got distracted"
  (`loopStartMs`). Everything else is native `play()`/`pause()`.
- Mounted muted, `contentFit="cover"`, no native controls — same as `VideoScrubTimer`.
- New component: `components/timer/SegmentVideoTimer.tsx`. Kept separate from
  `VideoScrubTimer.tsx` rather than merged, since the two drive playback in fundamentally
  different ways (continuous seek vs. mostly-native-play) — forcing one component to branch
  between both models would be harder to follow than two small theme-specific players
  dispatched by `VisualTimer.tsx`.

## Config Shape (per theme)
```ts
type SegmentThemeConfig = {
  id: string;
  videoSource: number;            // require() result
  videoDurationMs: number;
  introEndMs: number;
  loopStartMs: number;            // typically === introEndMs
  loopEndMs: number;
  outroStartMs: number;           // typically === loopEndMs
  distractDesatTargetPct?: number; // default 40
  distractCueMs?: number;          // default 800
};
```
Backend-authored per theme, never surfaced in user-facing settings. Adding a theme = a new
config entry + dropping the video in `assets/timer-themes/<theme>/`.

## Got Distracted — Visual Treatment
Deliberately gentle, not punitive — acknowledge the moment, invite refocus, no red/shake/harsh
cuts (wrong emotional register for an ADHD tool, where shame is counterproductive to
re-engagement). Desaturate toward ~40% over ~300ms, hold ~150-200ms, ease back to full over
~300ms as the loop restarts from `loopStartMs`. Total under ~800ms.

## Open Questions
- Confirm `timeUpdate` event frequency is precise enough to catch `loopEndMs` without overshoot;
  may need a small lookahead buffer if not.
- Whether `plant` should eventually move to this model too (not in scope here).
- Usage rights/commercial terms for the monk source video before a production build ships it.
