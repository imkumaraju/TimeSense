import { useEffect, useRef, useState } from 'react';
import { Animated, AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { VisualTimer } from '@/components/timer/VisualTimer';
import { TsButton } from '@/components/ui/TsButton';
import { colors, fonts } from '@/constants/theme';
import { showInterstitialIfDue } from '@/lib/ads';
import { isStaticImageStyle } from '@/lib/timerThemes';
import { createTask } from '@/lib/tasksDb';
import { pulseMilestoneFeedback } from '@/lib/timerFeedback';
import { formatClock } from '@/lib/timerMath';
import { useProfile } from '@/lib/useProfile';
import { useActiveTimerStore } from '@/stores/activeTimerStore';
import { useAuthStore } from '@/stores/authStore';

// See docs/concepts/feature-fullscreen-immersive-timer.md
const CONTROLS_IDLE_HIDE_MS = 2000;
const CONTROLS_FADE_MS = 250;

export default function ActiveTimerScreen() {
  const insets = useSafeAreaInsets();
  const snapshot = useActiveTimerStore((s) => s.snapshot);
  const meta = useActiveTimerStore((s) => s.meta);
  const milestoneFlags = useActiveTimerStore((s) => s.milestoneFlags);
  const tick = useActiveTimerStore((s) => s.tick);
  const pause = useActiveTimerStore((s) => s.pause);
  const resume = useActiveTimerStore((s) => s.resume);
  const addFiveMinutes = useActiveTimerStore((s) => s.addFiveMinutes);
  const toggleDigital = useActiveTimerStore((s) => s.toggleDigital);
  const pulse = useActiveTimerStore((s) => s.pulse);
  const setMilestoneFlags = useActiveTimerStore((s) => s.setMilestoneFlags);
  const getDerived = useActiveTimerStore((s) => s.getDerived);
  const start = useActiveTimerStore((s) => s.start);
  const user = useAuthStore((s) => s.user);
  const { isPlus } = useProfile();

  const [, setNow] = useState(() => Date.now());
  const [distractSignal, setDistractSignal] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsOpacity = useRef(new Animated.Value(1)).current;
  const idleTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (snapshot) return;
    let cancelled = false;
    (async () => {
      const task = await createTask({
        predictedSeconds: 25 * 60,
        visualStyle: 'pizza',
        userId: user?.id ?? null,
      });
      if (cancelled) return;
      start(25 * 60, {
        taskId: task.id,
        name: task.name,
        description: task.description,
        visualStyle: 'pizza',
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [snapshot, start, user?.id]);

  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
      pulse();
    }, 250);
    return () => clearInterval(id);
  }, [pulse]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setNow(Date.now());
        pulse();
      }
    });
    return () => sub.remove();
  }, [pulse]);

  useEffect(() => {
    if (!snapshot || snapshot.pauseStartedAtMs != null) return;
    let cancelled = false;
    void pulseMilestoneFeedback(snapshot, milestoneFlags).then((next) => {
      if (cancelled) return;
      if (
        next.halfway !== milestoneFlags.halfway ||
        next.oneMinute !== milestoneFlags.oneMinute ||
        next.complete !== milestoneFlags.complete
      ) {
        setMilestoneFlags(next);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [snapshot, milestoneFlags, tick, setMilestoneFlags]);

  const derived = getDerived(Date.now());
  void tick;

  const isPaused = derived?.isPaused ?? false;
  const isComplete = derived?.isComplete ?? false;

  const scheduleIdleHide = () => {
    if (idleTimeout.current) clearTimeout(idleTimeout.current);
    idleTimeout.current = setTimeout(
      () => setControlsVisible(false),
      CONTROLS_IDLE_HIDE_MS,
    );
  };

  useEffect(() => {
    Animated.timing(controlsOpacity, {
      toValue: controlsVisible ? 1 : 0,
      duration: CONTROLS_FADE_MS,
      useNativeDriver: true,
    }).start();
  }, [controlsVisible, controlsOpacity]);

  // Fresh start, resume-from-pause, or finish all reveal controls; pause/finish suspend
  // the idle-hide timer (finish never re-hides, pause resumes counting down on resume).
  useEffect(() => {
    setControlsVisible(true);
    if (isPaused || isComplete) {
      if (idleTimeout.current) clearTimeout(idleTimeout.current);
      return;
    }
    scheduleIdleHide();
    return () => {
      if (idleTimeout.current) clearTimeout(idleTimeout.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPaused, isComplete]);

  if (!meta || !derived) {
    return <View style={styles.container} />;
  }

  const onFinish = async () => {
    if (finishing) return;
    setFinishing(true);
    try {
      await showInterstitialIfDue(isPlus);
    } finally {
      router.replace('/timer/complete');
    }
  };

  const onDistracted = () => {
    setDistractSignal((n) => n + 1);
    if (!derived.isPaused) {
      pause();
    }
  };

  const onScreenTap = () => {
    if (isPaused || isComplete) return; // already forced visible, nothing to reveal/extend
    setControlsVisible(true);
    scheduleIdleHide();
  };

  // Non-static-image styles (pie/bar/ring) stay square-ish in the boxed `stage` layout.
  // Static-image styles (pizza/plant/monk/cat/moon) go full-bleed immersive below instead.
  const visualSize = 220;

  const immersive = isStaticImageStyle(meta.visualStyle);

  // Immersive backgrounds are full-bleed illustrated images, mostly light/pale — the boxed
  // layout's dark board background needs the opposite (light text on dark).
  const clock = meta.showDigital ? (
    <Text style={[styles.clock, immersive && styles.clockOnImage]}>
      {formatClock(derived.remainingSeconds)}
    </Text>
  ) : null;
  const subLabelText = derived.isComplete ? "Time's up" : meta.name ?? null;
  const subLabel = subLabelText ? (
    <Text
      style={[
        styles.sub,
        immersive && styles.subOnImage,
        !meta.showDigital && { marginTop: 14 },
      ]}>
      {subLabelText}
    </Text>
  ) : null;

  if (immersive) {
    return (
      <View style={styles.immersiveContainer}>
        <VisualTimer
          progress={derived.progress}
          style={meta.visualStyle}
          isPaused={derived.isPaused}
          isComplete={derived.isComplete}
          distractSignal={distractSignal}
          totalDurationSec={snapshot?.durationSeconds ?? 0}
          fullBleed
        />
        <Pressable style={StyleSheet.absoluteFill} onPress={onScreenTap} />

        <View pointerEvents="box-none" style={styles.immersiveClockWrap}>
          {clock}
          {subLabel}
        </View>

        <Animated.View
          pointerEvents={controlsVisible ? 'box-none' : 'none'}
          style={[styles.immersiveTop, { opacity: controlsOpacity, paddingTop: insets.top + 12 }]}>
          <LinearGradient
            colors={['rgba(0,0,0,0.45)', 'transparent']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.topRow}>
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Text style={styles.backOnVideo}>Back</Text>
            </Pressable>
            <Pressable onPress={toggleDigital} hitSlop={12}>
              <Text style={styles.backOnVideo}>
                {meta.showDigital ? 'Hide clock' : 'Show clock'}
              </Text>
            </Pressable>
          </View>
        </Animated.View>

        <Animated.View
          pointerEvents={controlsVisible ? 'box-none' : 'none'}
          style={[
            styles.immersiveBottom,
            { opacity: controlsOpacity, paddingBottom: insets.bottom + 20 },
          ]}>
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.5)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.row}>
            <TsButton
              label={derived.isPaused ? 'Resume' : 'Pause'}
              variant="secondaryOnDark"
              onPress={derived.isPaused ? resume : pause}
              style={styles.halfBtn}
            />
            <TsButton
              label="+5 min"
              variant="secondaryOnDark"
              onPress={addFiveMinutes}
              style={styles.halfBtn}
            />
          </View>
          <TsButton
            label="Got distracted"
            variant="ghost"
            onPress={onDistracted}
            textStyle={styles.distracted}
            style={{ marginTop: 4, marginBottom: 12 }}
          />
          <TsButton label={finishing ? "Loading…" : "Finish"} block disabled={finishing} onPress={() => void onFinish()} />
        </Animated.View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 20 },
      ]}>
      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>Back</Text>
        </Pressable>
        <Pressable onPress={toggleDigital} hitSlop={12}>
          <Text style={styles.back}>
            {meta.showDigital ? 'Hide clock' : 'Show clock'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.stage}>
        <VisualTimer
          progress={derived.progress}
          style={meta.visualStyle}
          size={visualSize}
          isPaused={derived.isPaused}
          isComplete={derived.isComplete}
          distractSignal={distractSignal}
          totalDurationSec={snapshot?.durationSeconds ?? 0}
        />
        {clock}
        {subLabel}

        <View style={styles.row}>
          <TsButton
            label={derived.isPaused ? 'Resume' : 'Pause'}
            variant="secondaryOnDark"
            onPress={derived.isPaused ? resume : pause}
            style={styles.halfBtn}
          />
          <TsButton
            label="+5 min"
            variant="secondaryOnDark"
            onPress={addFiveMinutes}
            style={styles.halfBtn}
          />
        </View>

        <TsButton
          label="Got distracted"
          variant="ghost"
          onPress={onDistracted}
          textStyle={styles.distracted}
          style={{ marginTop: 4, marginBottom: 12 }}
        />

        <TsButton label={finishing ? "Loading…" : "Finish"} block disabled={finishing} onPress={() => void onFinish()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.board,
    paddingHorizontal: 20,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  back: {
    fontFamily: fonts.bodyMedium,
    color: '#B99A7C',
    fontSize: 15,
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clock: {
    marginTop: 14,
    fontFamily: fonts.displaySemi,
    fontSize: 28,
    color: colors.cream,
  },
  clockOnImage: {
    color: colors.ink,
  },
  sub: {
    marginTop: 4,
    marginBottom: 20,
    fontFamily: fonts.body,
    fontSize: 13,
    color: '#B99A7C',
  },
  subOnImage: {
    color: colors.ink,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginBottom: 4,
  },
  halfBtn: {
    flex: 1,
  },
  distracted: {
    color: '#B99A7C',
  },
  immersiveContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  immersiveClockWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  immersiveTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  immersiveBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  backOnVideo: {
    fontFamily: fonts.bodyMedium,
    color: '#F3E9DA',
    fontSize: 15,
  },
});
