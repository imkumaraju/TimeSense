# Feature Update: Timer Themes Switch from Video to Static Image

## Summary
**This supersedes `feature-frame-sequence-animation.md` entirely.** Timer themes (monk, plant, pizza, cat, and any future themes) will now use a **single static illustrated image** per theme instead of a video. There is no playback, no timing curve, no loop, no freeze-hold, no segment boundaries — just one image, displayed full-screen for the duration of the timer session.

The full-screen immersive layout and auto-hiding UI behavior described in `feature-fullscreen-immersive-timer.md` are unchanged — only the background layer's content type changes, from video to image.

## Why This Change
The video approach went through several iterations (continuous scrubbing → intro/loop/outro with a seamless loop → intro/freeze-hold/resume) trying to solve the same underlying problem: getting AI-generated video to loop or hold convincingly without visible seams, drift, or lag. Each iteration reduced but didn't eliminate the risk of a generated clip not behaving as intended, and required real analysis effort (frame extraction, correlation testing) to verify each new clip actually worked before it could ship.

A static image sidesteps all of it: there's no loop to break, no seek/pause timing to get right, no drift, no lag, and no variable-duration handling needed at all — the same image works identically whether the timer is 1 second or 24 hours. It trades the subtle motion/atmosphere of video for a dramatic simplification of both the asset pipeline and the playback code, and removes an entire category of "does this clip actually work" verification work per theme.

## What's Removed
Everything in `feature-frame-sequence-animation.md` is no longer applicable, specifically:
- Video segment model (intro / loop / outro, or intro / freeze-hold / resume)
- Timing curves, progress-ratio mapping, variable-duration tiered update logic
- `seek()`/`pause()`/`play()` playback state machine
- Loop-seam verification (breathing cycles, rotational phase matching, correlation testing)
- Video-specific config fields (`videoDurationMs`, `introEndMs`, `loopStartMs`, `loopEndMs`, `outroStartMs`, etc.)
- Video encoding steps (H.264, keyframe interval tuning, bitrate targeting)

## What Stays the Same
- **Full-screen immersive display** (`feature-fullscreen-immersive-timer.md`): the theme visual still fills the entire screen edge-to-edge via `resizeMode: "cover"`, with the same auto-hiding controls, tap-to-reveal, and independent "Hide clock" behavior. Only the content behind that layer changes from `<Video>` to `<Image>`.
- **Source aspect ratio & cropping safety guidance**: still recommend 9:16 portrait (1080×1920) source images, with the subject kept centered within the middle ~85% of frame width and ~75-80% of frame height, for the same cross-device cropping reasons as before (tablets crop top/bottom, tall phones crop left/right under `cover`).
- **"Got distracted" visual treatment**: the desaturation-dip cue (~40% saturation over ~300ms, brief hold, ease back over ~300ms, under ~800ms total) still applies — if anything it's simpler now, since it's just a filter animation over a static image with no underlying video state to coordinate with.
- **Backend-only theme configuration**: theme assets and any per-theme settings remain config-driven, not user-editable, same as before.

## New Asset Preparation
1. Generate or source one illustrated image per theme (see current theme prompts below for reference).
2. Export at ~2x the max on-screen display size (not an arbitrarily large source resolution) — a full-screen mobile background typically doesn't need to exceed roughly 1080×1920 physical pixels even accounting for high-DPI displays, given the image is a background layer, not something users zoom into.
3. Use a compressed format suited to photographic/painterly imagery — WebP recommended (smaller than PNG/JPEG at equivalent visual quality for this kind of content); JPEG as a fallback if WebP support is a concern on a target platform.
4. Store per-theme image under `assets/timer-themes/<theme>/<theme>.webp` (or `.jpg`).

## New Rendering Approach (React Native)
- Use `expo-image`'s `<Image>` (not React Native core `<Image>` — see Implementation Notes: core `<Image>` produced a badly over-zoomed crop on real devices with these source images), `contentFit="cover"`, filling the screen the same way the video did.
- No preloading/priming logic needed beyond normal image caching — this removes the "first decode stall" concern that applied to video.
- The "got distracted" desaturation cue applies as a filter/overlay on top of the `<Image>`, same mechanism as before, just with a static image underneath instead of a video frame.

## New Config Shape (per theme)
```ts
type TimerThemeConfig = {
  id: string;                       // "monk" | "plant" | "pizza" | "cat" | ...
  imagePath: string;                // e.g. "assets/timer-themes/monk/monk.webp"
  distractDesatTargetPct?: number;  // default 40 — saturation % target during the "got distracted" dip
  distractCueMs?: number;           // default 800 — total duration of the desaturate-and-recover cue
};
```
This is a significant simplification over the video config — no duration, no segment boundaries, nothing time-related at all. Adding a new theme is now just: generate an image, drop it in the asset folder, add one config entry.

## Current Theme Set & Reference Prompts
The following themes have generation prompts already drafted (anime/illustrated key-art style, explicitly non-photorealistic, 9:16, same centered-safe-zone framing constraint as all prior assets):

- **Monk**: seated in meditation beneath a banyan tree, eyes closed, a glowing 8-spoke dharma wheel behind his head like a halo.
- **Plant**: a single flower in full bloom, stem rising from soil with two leaves, warm lighting, floating light particles.
- **Pizza**: a freshly baked pizza with bubbling cheese and visible toppings, resting on a wooden peel near a warm-glowing oven, a wisp of steam rising.
- **Cat**: a cat curled up asleep in a round plush cat bed, peaceful expression, cozy muted background.
- **Moon** (added 2026-09-05): a crescent moon night scene, replacing the old `MoonArc.tsx` SVG arc-drain rendering.

(Full prompt text for each is already available from prior design discussion — not duplicated here since this doc is about the architectural change, not the specific art direction. Pull the exact prompt wording from the design thread if regenerating any of these.)

## Implementation Notes (2026-09-05)
- Landed assets are PNG, not WebP (`assets/timer-themes/{monk,plant,pizza,cat,moon}/<theme>.png`, ~5.6-7MB each) — larger than the WebP target above; revisit compression before a production build if load time/bundle size becomes a concern.
- `pizza` here maps to the `pizza` `VisualStyle` (the default "Eating Pizza" style, labelled "Radial" in `STYLE_OPTIONS`) — not `pie` (labelled "Pizza", `EatingPizza` with slice lines), which keeps its original SVG rendering since no separate asset was provided for it.
- `moon` was added after the initial four-theme rollout, once its image asset landed — same config shape, no code changes beyond a `staticThemes` entry and the `VisualStyle` case in `VisualTimer.tsx`, as this doc's "Adding a new theme" note promised.
- `lib/timerThemes.ts` now exports `StaticThemeConfig` + a `staticThemes` registry (`pizza`, `plant`, `monk`, `cat`, `moon`) and `isStaticImageStyle()`, replacing `SegmentThemeConfig`/`segmentThemes`/`isVideoScrubStyle()`. `components/timer/StaticImageTimer.tsx` replaces `SegmentVideoTimer.tsx` as the renderer wired into `VisualTimer.tsx`.
- `SegmentVideoTimer.tsx` and the old theme videos (`assets/timer-themes/{monk,plant}/*.mp4`) are left in place but unused, same as `BanyanMonk.tsx` was after the prior migration — not yet deleted.
- `pie`'s `EatingPizza` SVG component stays in use (no separate asset for it); `cat`'s old `CatLoaf.tsx` and `moon`'s old `MoonArc.tsx` are now both unused the same way `BanyanMonk.tsx` was; `bar`/`ring` are untouched (still SVG, no static image assets provided for them).
- **On-device bug found and fixed (2026-09-05):** the first `sys` preview build showed all five static-image themes badly over-zoomed in the full-bleed immersive layout — e.g. the monk theme showed only the tree canopy filling the entire screen with the monk figure itself never visible, which the `cover` math for these images/screen sizes doesn't predict (should have shown near-full height with only mild side cropping). Root cause traced to React Native core `<Image>`'s `resizeMode="cover"` not reliably computing cover-fit for these large (5.6-7MB) PNGs when sized via `StyleSheet.absoluteFill` (edge insets only, no explicit numeric width/height). Fixed by switching `StaticImageTimer.tsx` to `expo-image`'s `<Image>` with `contentFit="cover"` instead — added as a new dependency (`npx expo install expo-image`), same API shape already used successfully for `expo-video`'s `contentFit`. This requires a fresh native build (new native module), same as `expo-video`/`expo-linear-gradient` did previously.

## Open Questions
- Whether any theme might later want a very subtle, purely decorative motion layer (e.g. a gentle particle drift via CSS/Reanimated over the static image) despite the base asset being a still image — this doc assumes fully static for now, but a lightweight ambient overlay wouldn't reintroduce the video complexity being removed here.
- Confirm WebP support/perf is acceptable across the actual target device range before finalizing format choice over JPEG (current landed assets are PNG, see Implementation Notes).

## Out of Scope / Follow-up
- Confirming usage rights/commercial terms for each source image before it ships in a production build (same consideration as previously noted for video, carried over here).
