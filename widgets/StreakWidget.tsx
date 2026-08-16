/**
 * Android home screen widget (BUILD_SPEC.md §10). Renders the mood snapshot computed by
 * lib/widgetSnapshot.ts — this file only lays out what it's given, it never computes mood
 * itself (compute-don't-store, same rule as Insights/Routines).
 *
 * The mascot is the real Chibi Tabby design (lib/chibiTabbySvg.ts, ported from
 * chibi-tabby-widget-design.html) rendered as live SVG via SvgWidget — not a static PNG
 * export. Layout mirrors the design doc's widget tile: streak badge top-left, task/sub lines
 * bottom-left over a scrim.
 */
import {
  FlexWidget,
  OverlapWidget,
  SvgWidget,
  TextWidget,
} from 'react-native-android-widget';

import { colors } from '@/constants/theme';
import { chibiTabbySvg } from '@/lib/chibiTabbySvg';
import type { WidgetSnapshot } from '@/lib/widgetSnapshot';

const STREAK_ICON: Record<WidgetSnapshot['mood'], string> = {
  calm: '🔥',
  alert: '🔥',
  worried: '⚠️',
  sad: '',
  completed: '🔥',
  resting: '🔥',
  freeze: '🧊',
  happy: '🏆',
};

type WidgetSize = 'small' | 'medium';

/** Below this dp width there isn't room for the task/sub lines — fall back to streak-only (§10.3). */
export function widgetSizeFor(widthDp: number): WidgetSize {
  return widthDp < 150 ? 'small' : 'medium';
}

export function StreakWidget(snapshot: WidgetSnapshot, size: WidgetSize = 'medium') {
  const streakLabel = STREAK_ICON[snapshot.mood]
    ? `${STREAK_ICON[snapshot.mood]} ${snapshot.streakCount}`
    : `${snapshot.streakCount}`;

  return (
    <OverlapWidget
      clickAction="OPEN_APP"
      style={{ height: 'match_parent', width: 'match_parent', borderRadius: 20 }}
    >
      <SvgWidget
        svg={chibiTabbySvg(snapshot.mood)}
        style={{ height: 'match_parent', width: 'match_parent' }}
      />

      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 10,
        }}
      >
        <TextWidget
          text={streakLabel}
          style={{ fontSize: 14, fontWeight: 'bold', color: colors.cream }}
        />

        {size === 'medium' && (
          <FlexWidget
            style={{
              flexDirection: 'column',
              backgroundColor: 'rgba(20, 13, 8, 0.55)',
              borderRadius: 12,
              padding: 6,
            }}
          >
            <TextWidget
              text={snapshot.taskLine}
              style={{ fontSize: 10, fontWeight: 'bold', color: colors.cream }}
              maxLines={2}
            />
            <TextWidget
              text={snapshot.subLine}
              style={{ fontSize: 8, color: colors.cream }}
              maxLines={1}
            />
          </FlexWidget>
        )}
      </FlexWidget>
    </OverlapWidget>
  );
}
