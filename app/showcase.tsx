import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  SHOWCASE_STYLES,
  ShowcaseStyleIcon,
} from '@/components/showcase/ShowcaseStyleIcon';
import { colors, fonts } from '@/constants/theme';
import { markShowcaseShownToday } from '@/lib/showcaseGate';

const ICON = 64;
const GAP = 20;
const STEP = ICON + GAP;
const DURATION_MS = 4600;
const REDUCED_HOLD_MS = 2200;

/**
 * Daily style conveyor — one pass, then Home. Spec: docs/concepts/first-launch-showcase.md
 */
export default function ShowcaseScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [activeIdx, setActiveIdx] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const finished = useRef(false);
  const translateX = useSharedValue(width);

  const trackWidth = useMemo(
    () => SHOWCASE_STYLES.length * STEP - GAP,
    [],
  );

  const finish = useCallback(async () => {
    if (finished.current) return;
    finished.current = true;
    await markShowcaseShownToday();
    router.replace('/(tabs)');
  }, []);

  const updateCaptionFromX = useCallback(
    (x: number) => {
      const centerX = width / 2;
      let closest = 0;
      let closestDist = Infinity;
      SHOWCASE_STYLES.forEach((_, i) => {
        const iconCenter = x + i * STEP + ICON / 2;
        const dist = Math.abs(iconCenter - centerX);
        if (dist < closestDist) {
          closestDist = dist;
          closest = i;
        }
      });
      setActiveIdx(closest);
    },
    [width],
  );

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((on) => {
      if (!cancelled) setReduceMotion(on);
    });
    const sub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      const t = setTimeout(() => {
        void finish();
      }, REDUCED_HOLD_MS);
      return () => clearTimeout(t);
    }

    finished.current = false;
    translateX.value = width;
    const endX = -trackWidth;
    translateX.value = withTiming(
      endX,
      { duration: DURATION_MS, easing: Easing.linear },
      (done) => {
        if (done) runOnJS(finish)();
      },
    );

    const id = setInterval(() => {
      updateCaptionFromX(translateX.value);
    }, 50);
    return () => clearInterval(id);
  }, [reduceMotion, width, trackWidth, translateX, finish, updateCaptionFromX]);

  const beltStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const active = SHOWCASE_STYLES[activeIdx] ?? SHOWCASE_STYLES[0]!;

  return (
    <View
      style={[
        styles.root,
        { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 },
      ]}>
      <View style={styles.wordmark}>
        <Text style={styles.brand}>TimeSense</Text>
        <Text style={styles.tag}>a timer for however you focus</Text>
      </View>

      <Pressable
        onPress={() => void finish()}
        hitSlop={12}
        style={styles.skipRow}
        accessibilityRole="button"
        accessibilityLabel="Skip showcase">
        <Text style={styles.skip}>Skip</Text>
      </Pressable>

      {reduceMotion ? (
        <View style={styles.staticRow}>
          {SHOWCASE_STYLES.map((s) => (
            <View key={s.id} style={styles.iconWrap}>
              <ShowcaseStyleIcon id={s.id} size={52} />
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.beltViewport}>
          <View style={styles.rail} />
          <Animated.View style={[styles.beltTrack, beltStyle]}>
            {SHOWCASE_STYLES.map((s) => (
              <View key={s.id} style={styles.iconWrap}>
                <ShowcaseStyleIcon id={s.id} size={ICON} />
              </View>
            ))}
          </Animated.View>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.captionH}>{active.name}</Text>
        <Text style={styles.captionS}>{active.desc}</Text>
        <View style={styles.dots}>
          {SHOWCASE_STYLES.map((s, i) => (
            <View
              key={s.id}
              style={[styles.dot, i === activeIdx && styles.dotActive]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.board,
  },
  wordmark: {
    alignItems: 'center',
    paddingTop: 12,
  },
  brand: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.cream,
  },
  tag: {
    marginTop: 4,
    fontFamily: fonts.body,
    fontSize: 12,
    color: '#B99A7C',
  },
  skipRow: {
    alignSelf: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  skip: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: '#B99A7C',
    textDecorationLine: 'underline',
  },
  beltViewport: {
    flex: 1,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  rail: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(217,138,61,0.35)',
  },
  beltTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GAP,
  },
  iconWrap: {
    width: ICON,
    height: ICON,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.boardLight,
  },
  staticRow: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingBottom: 8,
  },
  captionH: {
    fontFamily: fonts.displaySemi,
    fontSize: 18,
    color: colors.cream,
    marginBottom: 4,
  },
  captionS: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: '#B99A7C',
    textAlign: 'center',
    lineHeight: 18,
  },
  dots: {
    flexDirection: 'row',
    gap: 5,
    marginTop: 14,
    alignItems: 'center',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,246,230,0.25)',
  },
  dotActive: {
    width: 14,
    backgroundColor: colors.crust,
  },
});
