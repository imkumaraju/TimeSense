/**
 * Once-per-local-calendar-day gate for the style showcase belt.
 * Checked: AsyncStorage already used for settings; reuse rather than a new store.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { localDateString } from '@/lib/streakLogic';

const LAST_SHOWN_KEY = 'timesense.showcase.last_shown_date';

export async function shouldShowShowcaseToday(
  now: Date = new Date(),
): Promise<boolean> {
  const today = localDateString(now);
  const last = await AsyncStorage.getItem(LAST_SHOWN_KEY);
  return last !== today;
}

export async function markShowcaseShownToday(
  now: Date = new Date(),
): Promise<void> {
  await AsyncStorage.setItem(LAST_SHOWN_KEY, localDateString(now));
}
