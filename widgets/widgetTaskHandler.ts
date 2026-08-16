/**
 * Headless entry point Android calls on widget add/update/resize/click (BUILD_SPEC.md §10).
 * Registered from index.js. Never recomputes mood itself — reads whatever
 * lib/widgetSnapshot.ts last persisted (compute-don't-store, same rule as the rest of the app).
 */
import type { WidgetTaskHandler } from 'react-native-android-widget';

import { readWidgetSnapshot } from '@/lib/widgetSnapshot';
import { StreakWidget, widgetSizeFor } from '@/widgets/StreakWidget';

const RESTING_FALLBACK = {
  mood: 'resting' as const,
  streakCount: 0,
  routineName: null,
  reminderTime: null,
  taskLine: 'Open TimeSense',
  subLine: 'Start a timer to begin',
};

export const widgetTaskHandler: WidgetTaskHandler = async (props) => {
  const { widgetInfo, widgetAction, renderWidget } = props;

  switch (widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const snapshot = (await readWidgetSnapshot()) ?? RESTING_FALLBACK;
      renderWidget(StreakWidget(snapshot, widgetSizeFor(widgetInfo.width)));
      break;
    }
    case 'WIDGET_DELETED':
    case 'WIDGET_CLICK':
      // OPEN_APP click handling is native to the library; nothing else to do here.
      break;
  }
};
