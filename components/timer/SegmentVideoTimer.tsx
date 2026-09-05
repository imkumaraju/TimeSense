import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

/** Neutral warm gray used as the desaturation-dip tint — not a design token, just an overlay color. */
const DISTRACT_TINT = '#8f8a82';

/**
 * Unused since the 2026-09-05 migration to static-image themes (`StaticImageTimer.tsx`,
 * see docs/concepts/feature-static-theme-images.md) — kept in place, same as `BanyanMonk.tsx`
 * was after the prior migration, not yet deleted. `SegmentThemeConfig` no longer exists in
 * lib/timerThemes.ts, so its shape is inlined here to keep this file self-contained.
 */
type SegmentThemeConfig = {
  id: string;
  videoSource: number;
  videoDurationMs: number;
  introEndMs: number;
  distractDesatTargetPct?: number;
  distractCueMs?: number;
};

type Props = {
  theme: SegmentThemeConfig;
  /** Remaining fraction 1 → 0 (same convention as other VisualTimer styles). */
  progress: number;
  isPaused: boolean;
  isComplete: boolean;
  /** Total session duration in seconds — used to time the resume-to-end trigger. */
  totalDurationSec: number;
  /** Bump this (e.g. increment a counter) each time the user taps "Got distracted". */
  distractSignal?: number;
  size?: number;
  fullBleed?: boolean;
};

type Phase = 'intro' | 'hold' | 'resume';

/**
 * Theme-agnostic intro/freeze-hold/resume-to-end segment player — mostly native
 * play()/pause(), with at most one seek in normal operation (session start). See
 * docs/concepts/feature-frame-sequence-animation.md.
 */
export function SegmentVideoTimer({
  theme,
  progress,
  isPaused,
  isComplete,
  totalDurationSec,
  distractSignal = 0,
  size = 220,
  fullBleed = false,
}: Props) {
  const player = useVideoPlayer(theme.videoSource, (p) => {
    p.muted = true;
    p.loop = false;
    p.timeUpdateEventInterval = 0.25;
  });

  const resumeDurationSec = (theme.videoDurationMs - theme.introEndMs) / 1000;
  const phase = useRef<Phase>('intro');
  const lastDistractSignal = useRef(distractSignal);
  const started = useRef(false);
  const desatOverlay = useSharedValue(0);

  // Kick off the intro once, on mount.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    phase.current = 'intro';
    player.currentTime = 0;
    player.play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pause/resume tracks timer state directly — no seeking involved. During the hold, the
  // player is already paused, so a user pause/resume here is a no-op that leaves it frozen.
  useEffect(() => {
    if (isComplete) return; // finish handling below takes over
    if (isPaused) {
      player.pause();
    } else if (started.current && phase.current !== 'hold') {
      player.play();
    }
  }, [isPaused, isComplete, player]);

  // "Got distracted" — brief desaturation dip over whatever's on screen (frozen hold frame or
  // live intro/resume playback). No seeking, since there's no loop to restart.
  useEffect(() => {
    if (distractSignal === lastDistractSignal.current) return;
    lastDistractSignal.current = distractSignal;

    const cueMs = theme.distractCueMs ?? 800;
    const downMs = Math.round(cueMs * 0.375); // ~300ms of 800
    const holdMs = Math.round(cueMs * 0.1875); // ~150ms of 800
    const upMs = cueMs - downMs - holdMs;
    // Desaturation isn't directly available as a video filter in expo-video, so this
    // approximates it with a semi-transparent gray tint crossfaded over the video — see
    // "Got Distracted — Visual Treatment" in feature-frame-sequence-animation.md.
    const targetPct = theme.distractDesatTargetPct ?? 40;
    const overlayOpacity = ((100 - targetPct) / 100) * 0.55;
    desatOverlay.value = withSequence(
      withTiming(overlayOpacity, { duration: downMs, easing: Easing.out(Easing.quad) }),
      withTiming(overlayOpacity, { duration: holdMs }),
      withTiming(0, { duration: upMs, easing: Easing.in(Easing.quad) })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [distractSignal]);

  const desatStyle = useAnimatedStyle(() => ({ opacity: desatOverlay.value }));

  // Segment-boundary transitions, driven off native playback position and remaining time.
  useEffect(() => {
    const sub = player.addListener('timeUpdate', ({ currentTime }) => {
      if (isComplete || isPaused) return;
      const ms = currentTime * 1000;

      if (phase.current === 'intro' && ms >= theme.introEndMs - 33) {
        phase.current = 'hold';
        player.pause(); // no seek — already sitting on the intro's last frame
        return;
      }

      if (phase.current === 'hold') {
        const remainingSec = totalDurationSec * progress;
        if (remainingSec <= resumeDurationSec) {
          phase.current = 'resume';
          player.play(); // no seek — resumes exactly from introEndMs
        }
      }
    });
    return () => sub.remove();
  }, [player, theme, progress, totalDurationSec, resumeDurationSec, isComplete, isPaused]);

  // Finish (natural or manual/early) — play through from wherever it's paused/frozen to the end.
  useEffect(() => {
    if (!isComplete) return;
    if (phase.current === 'resume') return;
    phase.current = 'resume';
    player.play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isComplete]);

  if (fullBleed) {
    return (
      <View style={StyleSheet.absoluteFill}>
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          nativeControls={false}
          allowsFullscreen={false}
        />
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, styles.distractTint, desatStyle]}
        />
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <VideoView
        player={player}
        style={{ width: size, height: size }}
        contentFit="cover"
        nativeControls={false}
        allowsFullscreen={false}
      />
      <Animated.View pointerEvents="none" style={[styles.distractTint, desatStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  distractTint: { ...StyleSheet.absoluteFillObject, backgroundColor: DISTRACT_TINT },
});
