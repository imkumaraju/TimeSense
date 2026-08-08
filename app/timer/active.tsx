import { useEffect, useState } from 'react';
import {
  AppState,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { VisualTimer } from '@/components/timer/VisualTimer';
import { TsButton } from '@/components/ui/TsButton';
import { colors, fonts } from '@/constants/theme';
import { createTask } from '@/lib/tasksDb';
import { pulseMilestoneFeedback } from '@/lib/timerFeedback';
import { formatClock } from '@/lib/timerMath';
import { useActiveTimerStore } from '@/stores/activeTimerStore';
import { useAuthStore } from '@/stores/authStore';

export default function ActiveTimerScreen() {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
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

  const [, setNow] = useState(() => Date.now());

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

  if (!meta || !derived) {
    return <View style={styles.container} />;
  }

  const onFinish = () => {
    router.replace('/timer/complete');
  };

  const onDistracted = () => {
    if (!derived.isPaused) {
      pause();
    }
  };

  // Moon / Monk / Cat: full content width, compact height; others stay square-ish
  const contentWidth = Math.max(260, windowWidth - 40);
  const visualSize =
    meta.visualStyle === 'moon' ||
    meta.visualStyle === 'monk' ||
    meta.visualStyle === 'cat'
      ? contentWidth
      : 220;

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
        />
        {meta.showDigital ? (
          <Text style={styles.clock}>{formatClock(derived.remainingSeconds)}</Text>
        ) : null}
        <Text style={[styles.sub, !meta.showDigital && { marginTop: 14 }]}>
          {derived.isComplete
            ? "Time's up"
            : `${meta.showDigital ? 'remaining' : 'Time left'}${
                meta.name ? ` · ${meta.name}` : ''
              }`}
        </Text>

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

        <TsButton label="Finish" block onPress={onFinish} />
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
  sub: {
    marginTop: 4,
    marginBottom: 20,
    fontFamily: fonts.body,
    fontSize: 13,
    color: '#B99A7C',
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
});
