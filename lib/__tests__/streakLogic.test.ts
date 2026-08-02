import {
  applyStreakOnTaskComplete,
  calendarDaysBetween,
  localDateString,
  MAX_FREEZES,
} from '@/lib/streakLogic';

describe('localDateString', () => {
  it('formats as YYYY-MM-DD in local time', () => {
    const d = new Date(2026, 7, 2, 15, 30, 0); // Aug 2 2026
    expect(localDateString(d)).toBe('2026-08-02');
  });
});

describe('calendarDaysBetween', () => {
  it('counts whole calendar days', () => {
    expect(calendarDaysBetween('2026-08-01', '2026-08-02')).toBe(1);
    expect(calendarDaysBetween('2026-08-01', '2026-08-03')).toBe(2);
    expect(calendarDaysBetween('2026-08-02', '2026-08-02')).toBe(0);
  });
});

describe('applyStreakOnTaskComplete', () => {
  const base = {
    streakCount: 3,
    freezesAvailable: 2,
    lastActiveDate: '2026-08-01' as string | null,
  };

  it('no-ops when already active today', () => {
    const r = applyStreakOnTaskComplete(base, '2026-08-01');
    expect(r.changed).toBe(false);
    expect(r.streakCount).toBe(3);
    expect(r.lastActiveDate).toBe('2026-08-01');
  });

  it('increments on consecutive day', () => {
    const r = applyStreakOnTaskComplete(base, '2026-08-02');
    expect(r.changed).toBe(true);
    expect(r.streakCount).toBe(4);
    expect(r.freezeSpent).toBe(false);
    expect(r.lastActiveDate).toBe('2026-08-02');
  });

  it('spends a freeze for a one-day gap', () => {
    const r = applyStreakOnTaskComplete(base, '2026-08-03');
    expect(r.changed).toBe(true);
    expect(r.streakCount).toBe(4);
    expect(r.freezeSpent).toBe(true);
    expect(r.freezesAvailable).toBe(1);
    expect(r.lastActiveDate).toBe('2026-08-03');
  });

  it('resets when one-day gap but no freezes left', () => {
    const r = applyStreakOnTaskComplete(
      { ...base, freezesAvailable: 0 },
      '2026-08-03',
    );
    expect(r.streakCount).toBe(1);
    expect(r.freezeSpent).toBe(false);
    expect(r.freezesAvailable).toBe(0);
  });

  it('resets when gap is larger than one missed day', () => {
    const r = applyStreakOnTaskComplete(base, '2026-08-04');
    expect(r.streakCount).toBe(1);
    expect(r.freezeSpent).toBe(false);
    expect(r.freezesAvailable).toBe(2);
  });

  it('starts at 1 when never active', () => {
    const r = applyStreakOnTaskComplete(
      { streakCount: 0, freezesAvailable: 2, lastActiveDate: null },
      '2026-08-02',
    );
    expect(r.streakCount).toBe(1);
    expect(r.changed).toBe(true);
  });

  it('earns a freeze at 7-day milestone, capped at MAX_FREEZES', () => {
    const atSix = applyStreakOnTaskComplete(
      {
        streakCount: 6,
        freezesAvailable: 1,
        lastActiveDate: '2026-08-01',
      },
      '2026-08-02',
    );
    expect(atSix.streakCount).toBe(7);
    expect(atSix.freezeEarned).toBe(true);
    expect(atSix.freezesAvailable).toBe(2);

    const alreadyMax = applyStreakOnTaskComplete(
      {
        streakCount: 6,
        freezesAvailable: MAX_FREEZES,
        lastActiveDate: '2026-08-01',
      },
      '2026-08-02',
    );
    expect(alreadyMax.freezeEarned).toBe(false);
    expect(alreadyMax.freezesAvailable).toBe(MAX_FREEZES);
  });

  it('can earn a freeze on the same day a freeze was spent (milestone)', () => {
    // streak 6, miss one day, spend freeze → 7, then milestone +1 freeze
    const r = applyStreakOnTaskComplete(
      {
        streakCount: 6,
        freezesAvailable: 1,
        lastActiveDate: '2026-08-01',
      },
      '2026-08-03',
    );
    expect(r.freezeSpent).toBe(true);
    expect(r.streakCount).toBe(7);
    expect(r.freezeEarned).toBe(true);
    expect(r.freezesAvailable).toBe(1); // 1-1+1
  });
});
