import { StyleSheet, View } from 'react-native';

import { DrainingBar } from '@/components/timer/DrainingBar';
import { DrainingRing } from '@/components/timer/DrainingRing';
import { EatingPizza } from '@/components/timer/EatingPizza';
import { StaticImageTimer } from '@/components/timer/StaticImageTimer';
import { staticThemes } from '@/lib/timerThemes';
import type { VisualStyle } from '@/types/task';

type Props = {
  progress: number;
  style: VisualStyle;
  size?: number;
  isPaused?: boolean;
  isComplete?: boolean;
  distractSignal?: number;
  /** Session length in seconds — unused by static-image styles, kept for prop-shape parity. */
  totalDurationSec?: number;
  /** Static-image styles only — fills the parent edge-to-edge instead of a fixed size x size box. */
  fullBleed?: boolean;
};

/** Picks pizza / pie / plant / moon / monk / cat / bar / ring based on `visualStyle`. */
export function VisualTimer({ progress, style, size = 280, distractSignal = 0, fullBleed = false }: Props) {
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
  if (style === 'pizza' || style === 'plant' || style === 'monk' || style === 'cat' || style === 'moon') {
    const theme = staticThemes[style];
    // Defensive fallback if a theme is ever removed from lib/timerThemes.ts without
    // removing the VisualStyle case here.
    if (!theme) return <DrainingRing progress={progress} size={size} />;
    return (
      <StaticImageTimer theme={theme} distractSignal={distractSignal} size={size} fullBleed={fullBleed} />
    );
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
