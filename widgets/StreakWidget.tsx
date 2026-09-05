/**
 * Android home screen widget (BUILD_SPEC.md §10). Renders the mood snapshot computed by
 * lib/widgetSnapshot.ts — this file only lays out what it's given, it never computes mood
 * itself (compute-don't-store, same rule as Insights/Routines).
 *
 * The mascot is the real Chibi Tabby design (lib/chibiTabbySvg.ts, ported from
 * chibi-tabby-widget-design.html) rendered as live SVG via SvgWidget — not a static PNG
 * export. Layout mirrors the design doc's widget tile: task/sub lines bottom-left over a
 * scrim. The streak badge that used to sit top-left was removed 2026-09-05 along with the
 * rest of the streak UI (see docs/TODO.md) — streaks are being redesigned, not gone for good.
 */
import Constants from 'expo-constants';
import {
  FlexWidget,
  OverlapWidget,
  SvgWidget,
  TextWidget,
} from 'react-native-android-widget';

import { colors } from '@/constants/theme';
import { chibiTabbySvg } from '@/lib/chibiTabbySvg';
import type { WidgetSnapshot } from '@/lib/widgetSnapshot';

/**
 * Deep-link into New Timer prefilled for the due routine (§10.7) when there is one; otherwise
 * just open the app. `timer/new` resolves `routineId` into name/category/minutes/visualStyle
 * itself (see app/timer/new.tsx), so the widget only needs to know the id.
 */
function tapTarget(snapshot: WidgetSnapshot): { clickAction: string; clickActionData?: { uri: string } } {
  if (!snapshot.dueRoutineId) return { clickAction: 'OPEN_APP' };
  const scheme = Constants.expoConfig?.scheme;
  const schemeStr = Array.isArray(scheme) ? scheme[0] : scheme;
  if (!schemeStr) return { clickAction: 'OPEN_APP' };
  return {
    clickAction: 'OPEN_URI',
    clickActionData: { uri: `${schemeStr}://timer/new?routineId=${snapshot.dueRoutineId}` },
  };
}

type WidgetSize = 'small' | 'medium';

/** Below this dp width there isn't room for the task/sub lines — fall back to mascot-only (§10.3). */
export function widgetSizeFor(widthDp: number): WidgetSize {
  return widthDp < 150 ? 'small' : 'medium';
}

export function StreakWidget(snapshot: WidgetSnapshot, size: WidgetSize = 'medium') {
  return (
    <OverlapWidget
      {...tapTarget(snapshot)}
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
          justifyContent: 'flex-end',
          padding: 10,
        }}
      >
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
