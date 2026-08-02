import { StyleSheet, View } from 'react-native';

import { BanyanMonk } from '@/components/timer/BanyanMonk';
import { CatLoaf } from '@/components/timer/CatLoaf';
import { DrainingBar } from '@/components/timer/DrainingBar';
import { DrainingRing } from '@/components/timer/DrainingRing';
import { EatingPizza } from '@/components/timer/EatingPizza';
import { GrowingPlant } from '@/components/timer/GrowingPlant';
import { MoonArc } from '@/components/timer/MoonArc';
import type { VisualStyle } from '@/types/task';

type Props = {
  progress: number;
  style: VisualStyle;
  size?: number;
};

/** Picks pizza / pie / plant / moon / monk / cat / bar / ring based on `visualStyle`. */
export function VisualTimer({ progress, style, size = 280 }: Props) {
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
  if (style === 'plant') {
    return <GrowingPlant progress={progress} size={size} />;
  }
  if (style === 'moon') {
    return <MoonArc progress={progress} size={size} />;
  }
  if (style === 'monk') {
    return <BanyanMonk progress={progress} size={size} />;
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
