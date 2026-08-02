/**
 * Pure streak / freeze algorithm (local calendar days).
 * Spec: streak-logic-feature-spec.md — evaluated only on task complete.
 */

export const MAX_FREEZES = 2;
export const FREEZE_MILESTONE_DAYS = 7;

export type StreakState = {
  streakCount: number;
  freezesAvailable: number;
  lastActiveDate: string | null;
};

export type StreakApplyResult = StreakState & {
  /** True when last_active_date / counts changed. */
  changed: boolean;
  /** Freeze spent bridging a one-day gap. */
  freezeSpent: boolean;
  /** Freeze earned from a 7-day milestone this evaluation. */
  freezeEarned: boolean;
};

/** Device-local calendar date as YYYY-MM-DD. */
export function localDateString(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Calendar-day difference later − earlier (local, noon anchors avoid DST skew). */
export function calendarDaysBetween(earlier: string, later: string): number {
  const parse = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y!, m! - 1, d!, 12, 0, 0).getTime();
  };
  return Math.round((parse(later) - parse(earlier)) / (24 * 60 * 60 * 1000));
}

function maybeEarnFreeze(
  streakCount: number,
  freezesAvailable: number,
): { freezesAvailable: number; freezeEarned: boolean } {
  if (streakCount > 0 && streakCount % FREEZE_MILESTONE_DAYS === 0) {
    if (freezesAvailable < MAX_FREEZES) {
      return { freezesAvailable: freezesAvailable + 1, freezeEarned: true };
    }
  }
  return { freezesAvailable, freezeEarned: false };
}

/**
 * Apply streak rules for a completed task on `today` (YYYY-MM-DD, local).
 * Multiple completions the same day are a no-op.
 */
export function applyStreakOnTaskComplete(
  state: StreakState,
  today: string,
): StreakApplyResult {
  const freezes = Math.max(0, Math.min(MAX_FREEZES, state.freezesAvailable));

  if (state.lastActiveDate == null) {
    const next = maybeEarnFreeze(1, freezes);
    return {
      streakCount: 1,
      freezesAvailable: next.freezesAvailable,
      lastActiveDate: today,
      changed: true,
      freezeSpent: false,
      freezeEarned: next.freezeEarned,
    };
  }

  const daysSince = calendarDaysBetween(state.lastActiveDate, today);

  if (daysSince === 0) {
    return {
      streakCount: state.streakCount,
      freezesAvailable: freezes,
      lastActiveDate: state.lastActiveDate,
      changed: false,
      freezeSpent: false,
      freezeEarned: false,
    };
  }

  // Clock / timezone quirks: treat future last_active as reset
  if (daysSince < 0) {
    const next = maybeEarnFreeze(1, freezes);
    return {
      streakCount: 1,
      freezesAvailable: next.freezesAvailable,
      lastActiveDate: today,
      changed: true,
      freezeSpent: false,
      freezeEarned: next.freezeEarned,
    };
  }

  if (daysSince === 1) {
    const streakCount = state.streakCount + 1;
    const next = maybeEarnFreeze(streakCount, freezes);
    return {
      streakCount,
      freezesAvailable: next.freezesAvailable,
      lastActiveDate: today,
      changed: true,
      freezeSpent: false,
      freezeEarned: next.freezeEarned,
    };
  }

  if (daysSince === 2 && freezes > 0) {
    const streakCount = state.streakCount + 1;
    const afterSpend = freezes - 1;
    const next = maybeEarnFreeze(streakCount, afterSpend);
    return {
      streakCount,
      freezesAvailable: next.freezesAvailable,
      lastActiveDate: today,
      changed: true,
      freezeSpent: true,
      freezeEarned: next.freezeEarned,
    };
  }

  // Gap too large, or one-day gap with no freeze
  const next = maybeEarnFreeze(1, freezes);
  return {
    streakCount: 1,
    freezesAvailable: next.freezesAvailable,
    lastActiveDate: today,
    changed: true,
    freezeSpent: false,
    freezeEarned: next.freezeEarned,
  };
}
