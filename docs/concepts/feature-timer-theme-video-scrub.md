# Feature: Timer Theme Animations (Video Scrub)

> **Fully superseded 2026-08-23** by `feature-timer-theme-intro-loop-outro.md` — `plant`
> (this doc's only theme) migrated to the intro/loop/outro segment model alongside `monk`, with
> a new portrait 9:16 source video authored for that model. `VideoScrubTimer.tsx` and the old
> continuous-seek `TimerThemeConfig`/`timingCurve` types have been deleted from
> `lib/timerThemes.ts`. Kept here for historical context only — do not build against this doc.
>
> Previously: supersedes the earlier frame-sequence ("flipbook") spec. 130 extracted PNG frames
> at usable quality came to ~112MB — far too large for a mobile bundle. Video scrubbing was the
> only approach at the time; there was no static-frame/image-sequence fallback.

## Summary
Replace the current flat/static timer icons with a themed animation (e.g. seed → sprout → stem → bud → bloom) that progresses in sync with timer countdown. This applies to any timer "theme" (flower, pizza, or future themes) — the mechanism is theme-agnostic; only the source video changes per theme.

Implementation is video-scrubbing only: a single compressed video per theme, with its playhead seeked in sync with timer progress. No static-frame/image-sequence fallback — video is the sole approach.

## Background
Current timer screens show a single static illustration for the whole session with no motion tied to progress. We want each theme's icon to visibly progress through the source animation as the timer counts down, using an owned/licensed reference animation as the source.

An earlier version of this spec considered extracting individual frames and swapping between them ("flipbook" approach). That was ruled out: 130 extracted frames at usable quality came to ~112MB, far too large for a mobile bundle, and even a trimmed/re-encoded frame set would still cost more space and code for a worse motion result than just keeping the source as a video. Video codecs compress temporal redundancy between frames far better than treating each frame as a standalone image, so the same source material lands at a fraction of the size with full motion smoothness preserved — not just a handful of sampled steps. **Video scrubbing is the only approach going forward.**

## Goals
- Smoothly animate a themed illustration across the life of a timer session, using an authored source video.
- Keep memory and bundle size reasonable on both iOS and Android.
- Support pause, resume, "got distracted," and early finish without jarring jumps.
- Handle timer durations ranging from ~1 second to ~24 hours against a fixed-length source video.
- Make adding a new theme (new source video) straightforward — no code changes beyond a config entry.

## Non-goals
- No runtime video generation or AI calls during animation playback.
- No static-frame/image-sequence fallback path.
- Not building a general-purpose video player; playback is driven entirely by timer progress, not user scrubbing/controls.

## What's needed
The **source video file itself** per theme (e.g. `flower.mp4`) — not extracted frames. The video gets encoded once, ahead of time (build-time, not runtime), into the asset that ships in the app.

## Asset Preparation
1. Provide the original video per theme.
2. Encode once (build-time) to:
   - H.264 `.mp4`, no audio track
   - Resolution: ~2x the max on-screen display size (e.g. 400-600px), not source resolution
   - Target bitrate tuned for a short muted loop — a 10-15s clip at display resolution typically lands in the **2-6MB range** at solid visual quality, versus ~112MB as loose full-res frames
3. Store per-theme video under `assets/timer-themes/<theme>/<theme>.mp4`.
4. Record each theme's video duration and any timing-curve checkpoints (see below) in that theme's config.

## Timing Curve (video position → progress mapping)
Linear mapping (`targetMs = progress * videoDurationMs`) is the default, but themes may define a non-linear curve so playback lingers on key beats (e.g. hold longer on the "bloom opening" portion rather than moving through it at the same rate as the "seed" portion).

```ts
type TimingCurve = { at: number; atVideoMs: number }[]; // at: 0-1 progress checkpoint, atVideoMs: video position to reach by that point

// Example: linger on the bloom-opening portion in the back half of the session
const flowerCurve: TimingCurve = [
  { at: 0.0,  atVideoMs: 0 },
  { at: 0.4,  atVideoMs: 4800 },   // reach "stem + leaves" by 40%
  { at: 0.6,  atVideoMs: 7200 },   // reach "bud forming" by 60%
  { at: 0.85, atVideoMs: 10200 },  // slow down through bloom-opening 60-85%
  { at: 1.0,  atVideoMs: 12000 },  // full bloom at completion
];
```

If a theme has no custom curve, fall back to linear mapping across its `videoDurationMs`.

## Variable Duration Handling

Timer sessions can range from ~1 second to ~24 hours. The source video has a fixed length (e.g. 10-15s) regardless of session length, so the mapping between "timer progress" and "position in the video" needs explicit rules — it can't just be "elapsed seconds = seconds into the video."

### Core principle: always map by progress ratio, never by absolute elapsed time
`progress = elapsed / totalDuration` is already duration-agnostic (it's always a 0-1 value no matter if `totalDuration` is 1 second or 86,400 seconds). The timing curve above is keyed to this ratio, not to elapsed seconds directly, so the same curve definition works unmodified whether the session is 5 minutes or 5 hours.

### Update/seek frequency should scale with session length
Recomputing and seeking on every timer tick is wasteful (and imperceptible) for long sessions, and can also be *too coarse* for very short ones if the tick interval is fixed. Scale the check interval to the session length instead of using one fixed tick rate for the animation specifically (the countdown display itself can still tick every second):
- Under ~1 minute: check every 100-250ms (need fine granularity — the whole video plays out fast).
- ~1 minute to ~1 hour: check every 1-2s (existing timer tick cadence is already fine).
- Over ~1 hour: check every 5-15s — the video is moving so slowly there's no benefit to finer updates, and it saves battery on long-running sessions.
- In all cases, skip the seek call entirely if the computed target position hasn't meaningfully changed since the last update (e.g. less than ~1 video frame's worth of movement, ~33ms at 30fps) — avoids redundant native calls.

### Minimum duration floor (very short timers)
Below some threshold, there isn't enough time for the video to read as *animating* rather than flickering — e.g. a 2-second timer scrubbing through a 12-second video means each visual state is on screen for a fraction of a second. Define a `minAnimatedDurationSec` per theme (suggested default: ~8-10s):
- **Below the floor:** skip animated playback. Show the start-frame while running, and cut directly to the final/completion frame at finish. No seeking in between — trying to animate would just look like a glitch, not motion.
- **At or above the floor:** full timing-curve playback as specified above.

### No special handling needed at the long end
Because the mapping is ratio-based, a 24-hour timer doesn't need a different curve or a cap — it just moves through the same curve extremely slowly, which is the intended effect (the whole point of a duration-agnostic time-blindness visual is that "almost no visible motion yet" *is* the correct, honest representation of "almost no time has passed"). The only change at this end is the reduced update-check frequency above, purely for efficiency, not correctness.

## Playback Behavior

| Event | Behavior |
|---|---|
| Timer starts | Seek to `t=0`, hold. |
| Timer running | Seek forward per timing curve as `elapsed` increases (subject to the update-frequency scaling above). |
| Pause | Freeze at current playhead position (`pause()` — no seeking). |
| Resume | Continue seeking forward from current position. |
| "Got distracted" | Seek backward a small amount (theme-configurable, default: 1-1.5s of source video) with a distinct easing, then resume forward once the timer resumes — signals a small setback without fully resetting. |
| +5 min / time extended | Recompute `totalDuration`; continue seeking forward at the adjusted pace, never backward. |
| Finish (natural or manual/early) | Seek to final frame (`videoDurationMs` minus a small epsilon) with a slightly slower seek/ease as a "payoff" beat — finishing early still gets the completion payoff. |

## Rendering Approach (React Native)
- Use `expo-video` (SDK 54's supported video library — `expo-av` is deprecated). Mount the video muted, `paused` by default, `resizeMode="cover"` (`contentFit="cover"` in expo-video's API).
- On each check interval (per the variable-duration scaling above): compute `progress = elapsed / totalDuration`, resolve target playback time via the timing curve, and set the player's position directly (`player.currentTime = targetTimeSeconds`).
- No manual crossfading needed — scrubbing a video's own playhead is inherently smooth; the codec's interpolated frames handle it natively.
- Preload/prime the video on timer-screen mount so the first seek isn't the first decode.

## Config Shape (per theme)
```ts
type TimerThemeConfig = {
  id: string;                      // "flower" | "pizza" | ...
  videoPath: string;               // e.g. "assets/timer-themes/flower/flower.mp4"
  videoDurationMs: number;
  timingCurve?: TimingCurve;       // omit for linear
  distractSeekBackMs?: number;     // default 1200
  finishSeekEaseMs?: number;       // default 500
  minAnimatedDurationSec?: number; // default 8 — below this, skip animation, snap start-finish
};
```
Adding a new theme = adding a new config entry + dropping a video in the matching asset folder. No changes needed to the playback component itself.

## Open Questions
- Exact `minAnimatedDurationSec` floor — default proposed 8s, confirm by feel once running on-device.
- Confirm `expo-video` seek performance feels smooth enough on target devices, especially for the sub-minute fine-grained seek cadence.
- Exact video length/pacing per theme (depends on final source clip content — adjust timing curve after visual review).
- Whether "Got distracted" needs a distinct visual treatment beyond seeking backward (e.g. desaturation), or if the backward motion alone reads clearly enough.

## Out of Scope / Follow-up
- Confirming usage rights/commercial terms for the source video before it ships in a production build (separate from this technical spec).
