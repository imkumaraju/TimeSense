# Feature: Full-Screen Immersive Timer View

> Scope decision (2026-08-22): applies only to video-scrub styles (currently `plant`; see
> `feature-timer-theme-video-scrub.md`). SVG styles (pizza, pie, moon, monk, cat, bar, ring)
> keep the existing centered/boxed `stage` layout in `app/timer/active.tsx` — there's no
> "theme video" for them to go full-bleed with.
>
> Open question resolved (2026-08-22): "Got distracted" suspends the auto-hide idle timer
> the same way Pause does.

## Summary
The theme video (see `feature-timer-theme-video-scrub.md`) becomes a true full-bleed background filling the entire timer screen — not a bounded square/card. All UI chrome (Back, Hide clock, countdown, Pause, +5 min, Got distracted, Finish) sits as an overlay on top of it, and auto-hides shortly after the timer starts, leaving just the video visible. Touching the screen brings the UI back temporarily; it hides again after a period of inactivity while the timer keeps running.

This is a layout/interaction change on top of the existing video-scrub playback (`feature-timer-theme-video-scrub.md`) — the video's progress-syncing behavior is unchanged, only how it's displayed and how the surrounding UI behaves.

## Goals
- Video fills the entire screen edge-to-edge as the background of the timer view — the "square box" framing goes away entirely (for video-scrub styles).
- All control UI auto-hides ~2 seconds after the timer starts running, so the video is the only thing on screen during undistracted focus time.
- A single tap anywhere on screen brings the full UI back; it auto-hides again after the same inactivity window if the timer is still running.
- "Hide clock" independently controls only the countdown text, separate from the auto-hide behavior for the rest of the controls.

## Non-goals
- Not changing the video-scrub/timing-curve mechanism itself — this is purely the screen layout and UI visibility behavior around it.
- Not adding new gestures beyond a single tap-to-reveal (no swipe/long-press behavior specified here).
- Not applied to SVG (non-video) timer styles — they keep their current layout.

## Layout

- **Background layer:** the theme video, `position: absolute`, filling the full screen (`width: 100%`, `height: 100%`), `resizeMode: "cover"` so it crops to fill rather than letterboxing — no card, no border radius, no fixed square dimensions. Renders behind the status bar area too (edge-to-edge), with UI elements respecting safe-area insets on top of it.
- **Overlay layer:** everything currently on the timer screen (Back, Hide clock, countdown number + "remaining · [label]" line, Pause, +5 min, Got distracted, Finish) sits in a layer on top of the video, unchanged in their existing positions/styling. Since the video is now full-bleed behind text/buttons, add a subtle gradient scrim (e.g. dark-to-transparent) behind the top bar and bottom control cluster only — not the full screen — so text/buttons stay legible against varying video content, without darkening the video everywhere.

## Visibility States

Two independent visibility controls layered on top of each other:

1. **Controls visibility** (auto-hide/reveal) — governs Back, Hide clock link, Pause, +5 min, Got distracted, Finish. Driven by timer running-state + touch activity (see below).
2. **Clock visibility** (manual toggle only) — governs just the countdown number + "remaining · [label]" line. Controlled solely by the existing "Hide clock" tap; not affected by the auto-hide timer.

These are independent: a person can have the clock hidden (via "Hide clock") while controls are still auto-hiding/revealing normally on their own timer, and vice versa.

### Controls auto-hide behavior

| Trigger | Behavior |
|---|---|
| Timer starts (Start pressed) | Controls visible initially; if no screen touch occurs, controls fade out ~2s after start. |
| Timer running, no touch for 2s (idle timeout) | Controls fade out (applies both on initial start and any time after a reveal). |
| Screen tapped while controls are hidden | Controls fade back in immediately. Idle timer restarts. |
| Screen tapped while controls are already visible | No-op for visibility (tap doesn't hide them early) — just resets/extends the idle timer so they don't disappear mid-interaction. |
| Timer paused | Controls stay visible; auto-hide timer is suspended while paused (don't hide controls on someone mid-pause). |
| "Got distracted" tapped | Same as Pause — controls stay visible, auto-hide timer suspended (it also pauses the timer itself, and triggers its own brief seek-back animation). |
| Timer resumed from pause | Same as a fresh start — idle timer begins counting again from the resume moment. |
| Timer finishes (naturally or via Finish) | Controls become visible (finish state needs to be seen/interacted with) — no auto-hide on the finish screen. |

The video itself keeps playing/seeking per its timing curve regardless of controls visibility — hiding the UI never pauses or affects video playback, it only affects the overlay.

### Hide clock behavior
- Tapping "Hide clock" hides the countdown number + remaining-time line only. Tapping it again (now likely labeled "Show clock") brings it back.
- Because "Hide clock" is itself one of the auto-hiding controls, reaching it after controls have auto-hidden requires a tap-to-reveal first, then tapping "Hide clock" — consistent with how Back and the other controls behave.
- The clock's hidden/shown state persists across the controls' own auto-hide/reveal cycles — hiding controls doesn't implicitly re-show the clock, and revealing controls doesn't implicitly hide it either. It only changes when explicitly tapped.

## Config
```ts
type ImmersiveViewConfig = {
  controlsIdleHideMs: number;   // default 2000 — delay before controls auto-hide after start/reveal/resume
  controlsFadeMs: number;       // default 250 — fade duration for show/hide transition
  scrimOpacity: number;         // default 0.35 — gradient scrim strength behind top/bottom control clusters
};
```

## Open Questions
- Should the idle-hide timer be paused/reset by other passive signals (e.g. device motion, screen-on state) or purely by direct touch as specified here? (Shipping with touch-only for now.)
- Any haptic or subtle visual cue on auto-hide (so it doesn't feel like the app froze), or should the fade itself be sufficient signal? (Shipping with fade-only for now.)
