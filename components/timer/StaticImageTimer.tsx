import { Image, StyleSheet, View } from 'react-native';
import { useEffect, useRef } from 'react';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import type { StaticThemeConfig } from '@/lib/timerThemes';

/** Neutral warm gray used as the desaturation-dip tint — not a design token, just an overlay color. */
const DISTRACT_TINT = '#8f8a82';

type Props = {
  theme: StaticThemeConfig;
  /** Bump this (e.g. increment a counter) each time the user taps "Got distracted". */
  distractSignal?: number;
  size?: number;
  fullBleed?: boolean;
};

/**
 * Theme-agnostic static-image renderer — no playback, no timing, just one image plus the
 * "got distracted" desaturation-dip overlay. See docs/concepts/feature-static-theme-images.md.
 */
export function StaticImageTimer({ theme, distractSignal = 0, size = 220, fullBleed = false }: Props) {
  const lastDistractSignal = useRef(distractSignal);
  const desatOverlay = useSharedValue(0);

  useEffect(() => {
    if (distractSignal === lastDistractSignal.current) return;
    lastDistractSignal.current = distractSignal;

    const cueMs = theme.distractCueMs ?? 800;
    const downMs = Math.round(cueMs * 0.375); // ~300ms of 800
    const holdMs = Math.round(cueMs * 0.1875); // ~150ms of 800
    const upMs = cueMs - downMs - holdMs;
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

  if (fullBleed) {
    return (
      <View style={StyleSheet.absoluteFill}>
        <Image source={theme.imageSource} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, styles.distractTint, desatStyle]}
        />
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Image source={theme.imageSource} style={{ width: size, height: size }} resizeMode="cover" />
      <Animated.View pointerEvents="none" style={[styles.distractTint, desatStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  distractTint: { ...StyleSheet.absoluteFillObject, backgroundColor: DISTRACT_TINT },
});
