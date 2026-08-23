/** Config for intro/loop/outro segment-based video timer themes — see docs/concepts/feature-timer-theme-intro-loop-outro.md. */

export type SegmentThemeConfig = {
  id: string;
  /** `require()` result for the theme's source video. */
  videoSource: number;
  videoDurationMs: number;
  introEndMs: number;
  loopStartMs: number;
  loopEndMs: number;
  outroStartMs: number;
  /** Saturation % target during the "got distracted" dip. Default 40. */
  distractDesatTargetPct?: number;
  /** Total duration of the desaturate-and-recover cue, ms. Default 800. */
  distractCueMs?: number;
};

// Source: assets/timer-themes/plant/plant.mp4 — 720x1280 portrait (9:16, matches the
// cross-device cropping-safety guidance), 10.006s, 2.6MB (probed via mp4 mvhd/tkhd boxes
// 2026-08-23; replaces the earlier landscape 1280x720 continuous-scrub-era asset, migrating
// plant off the old timing-curve model onto intro/loop/outro segments). Boundaries match the
// video's generation prompt: seed->sprout->closed bud 0-2s, seamless-loop bud
// breathing/anticipation 2-8s, bud opens to full bloom 8-10s.
export const plantTheme: SegmentThemeConfig = {
  id: 'plant',
  videoSource: require('../assets/timer-themes/plant/plant.mp4'),
  videoDurationMs: 10006,
  introEndMs: 2000,
  loopStartMs: 2000,
  loopEndMs: 8000,
  outroStartMs: 8000,
  distractDesatTargetPct: 40,
  distractCueMs: 800,
};

// Source: assets/timer-themes/monk/monk.mp4 — 720x1280 portrait (9:16, matches the
// cross-device cropping-safety guidance), 10.006s, 2.5MB (probed via mp4 mvhd/tkhd boxes
// 2026-08-23; replaces the earlier landscape 1280x720 draft asset). Segment boundaries below
// match the video's actual generation prompt (confirmed 2026-08-23): walk-in/sit/eyes-close
// 0-2s, seamless-loop stillness 2-8s, eyes-open/stand/walk-out 8-10s.
export const monkTheme: SegmentThemeConfig = {
  id: 'monk',
  videoSource: require('../assets/timer-themes/monk/monk.mp4'),
  videoDurationMs: 10006,
  introEndMs: 2000,
  loopStartMs: 2000,
  loopEndMs: 8000,
  outroStartMs: 8000,
  distractDesatTargetPct: 40,
  distractCueMs: 800,
};

export const segmentThemes: Record<string, SegmentThemeConfig> = {
  plant: plantTheme,
  monk: monkTheme,
};

/** Video-scrub styles get the full-screen immersive layout — see feature-fullscreen-immersive-timer.md. */
export function isVideoScrubStyle(style: string): boolean {
  return style in segmentThemes;
}
