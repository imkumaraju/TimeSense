/**
 * Pure helpers for recurring routines (weekdays, due-today, expo notif mapping).
 */

export function localDateString(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parse "0,2,5" → sorted unique 0–6. */
export function parseRecurrenceDays(raw: string): number[] {
  const set = new Set<number>();
  for (const part of raw.split(',')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const n = Number(trimmed);
    if (Number.isInteger(n) && n >= 0 && n <= 6) set.add(n);
  }
  return Array.from(set).sort((a, b) => a - b);
}

export function serializeRecurrenceDays(days: number[]): string {
  return parseRecurrenceDays(days.join(',')).join(',');
}

/** JS Date.getDay() 0–6 → expo-notifications weekly weekday 1–7. */
export function jsWeekdayToExpo(jsDay: number): number {
  if (jsDay < 0 || jsDay > 6) {
    throw new Error(`Invalid JS weekday: ${jsDay}`);
  }
  return jsDay + 1;
}

export function expoWeekdayToJs(expoDay: number): number {
  if (expoDay < 1 || expoDay > 7) {
    throw new Error(`Invalid expo weekday: ${expoDay}`);
  }
  return expoDay - 1;
}

export type DueCheckInput = {
  active: boolean;
  recurrenceDays: string;
  startDate: string;
  endDate: string | null;
};

export function isDueOnDate(
  routine: DueCheckInput,
  on: Date = new Date(),
): boolean {
  if (!routine.active) return false;
  const day = on.getDay();
  const days = parseRecurrenceDays(routine.recurrenceDays);
  if (!days.includes(day)) return false;

  const today = localDateString(on);
  if (routine.startDate && today < routine.startDate) return false;
  if (routine.endDate && today > routine.endDate) return false;
  return true;
}

/** True when today is strictly after end_date (notifications should be cancelled). */
export function isPastEndDate(
  endDate: string | null,
  on: Date = new Date(),
): boolean {
  if (!endDate) return false;
  return localDateString(on) > endDate;
}

/** "9:00 AM" / "6:30 PM" from 24h hour/minute. */
export function formatReminderTime(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${String(minute).padStart(2, '0')} ${period}`;
}

const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "Every Fri" / "Weekdays" / "Every day" / "Mon, Wed, Fri" from a stored recurrence string. */
export function describeRecurrenceDays(raw: string): string {
  const days = parseRecurrenceDays(raw);
  if (days.length === 0) return 'No days selected';
  if (days.length === 7) return 'Every day';
  if (days.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d))) {
    return 'Weekdays';
  }
  if (days.length === 1) return `Every ${DAY_ABBR[days[0]]}`;
  return days.map((d) => DAY_ABBR[d]).join(', ');
}

/** "Ongoing" or "Ends Dec 1" from a stored end_date (or null). */
export function describeEndDate(endDate: string | null): string {
  if (!endDate) return 'Ongoing';
  const [y, m, d] = endDate.split('-').map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  return `Ends ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}
