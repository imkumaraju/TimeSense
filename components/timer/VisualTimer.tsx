import { StyleSheet, View } from 'react-native';

import { CatLoaf } from '@/components/timer/CatLoaf';
import { DrainingBar } from '@/components/timer/DrainingBar';
import { DrainingRing } from '@/components/timer/DrainingRing';
import { EatingPizza } from '@/components/timer/EatingPizza';
import { SegmentVideoTimer } from '@/components/timer/SegmentVideoTimer';
import { MoonArc } from '@/components/timer/MoonArc';
import { segmentThemes } from '@/lib/timerThemes';
import type { VisualStyle } from '@/types/task';

type Props = {
  progress: number;
  style: VisualStyle;
  size?: number;
  isPaused?: boolean;
  isComplete?: boolean;
  distractSignal?: number;
  /** Session length in seconds — required by video-scrub styles (e.g. `plant`). */
  totalDurationSec?: number;
  /** Video-scrub styles only — fills the parent edge-to-edge instead of a fixed size x size box. */
  fullBleed?: boolean;
};

/** Picks pizza / pie / plant / moon / monk / cat / bar / ring based on `visualStyle`. */
export function VisualTimer({
  progress,
  style,
  size = 280,
  isPaused = false,
  isComplete = false,
  distractSignal = 0,
  totalDurationSec = 0,
  fullBleed = false,
}: Props) {
  if (style === 'bar') {
    return (
      <View style={styles.center}>
        <DrainingBar progress={progress} height={size} />
      </View>
    );
  }
  if (style === 'ring') {
    return <DrainingRing progress={progress} size={size} />;
  }
  if (style === 'moon') {
    return <MoonArc progress={progress} size={size} />;
  }
  if (style === 'plant' || style === 'monk') {
    const theme = segmentThemes[style];
    // Defensive fallback if a theme is ever removed from lib/timerThemes.ts without
    // removing the VisualStyle case here.
    if (!theme) return <DrainingRing progress={progress} size={size} />;
    return (
      <SegmentVideoTimer
        theme={theme}
        progress={progress}
        isPaused={isPaused}
        isComplete={isComplete}
        totalDurationSec={totalDurationSec}
        distractSignal={distractSignal}
        size={size}
        fullBleed={fullBleed}
      />
    );
  }
  if (style === 'cat') {
    return <CatLoaf progress={progress} size={size} />;
  }
  if (style === 'pie') {
    return <EatingPizza progress={progress} size={size} showSliceLines />;
  }
  return <EatingPizza progress={progress} size={size} />;
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
