import {
  addDurationSeconds,
  createTimer,
  deriveTimer,
  formatClock,
  getElapsedMs,
  pauseTimer,
  resumeTimer,
} from '@/lib/timerMath';

const T0 = 1_700_000_000_000;

describe('createTimer', () => {
  it('starts unpaused with the given duration', () => {
    const timer = createTimer(60, T0);
    expect(timer.durationSeconds).toBe(60);
    expect(timer.startedAtMs).toBe(T0);
    expect(timer.pausedTotalMs).toBe(0);
    expect(timer.pauseStartedAtMs).toBeNull();
  });

  it('rejects non-positive duration', () => {
    expect(() => createTimer(0, T0)).toThrow();
    expect(() => createTimer(-5, T0)).toThrow();
  });
});

describe('getElapsedMs / deriveTimer', () => {
  it('computes elapsed from wall clock, not a tick counter', () => {
    const timer = createTimer(120, T0);
    expect(getElapsedMs(timer, T0 + 45_000)).toBe(45_000);

    const derived = deriveTimer(timer, T0 + 45_000);
    expect(derived.elapsedSeconds).toBe(45);
    expect(derived.remainingSeconds).toBe(75);
    expect(derived.progress).toBeCloseTo(75 / 120);
    expect(derived.isComplete).toBe(false);
    expect(derived.isPaused).toBe(false);
  });

  it('clamps at completion when now exceeds duration', () => {
    const timer = createTimer(30, T0);
    const derived = deriveTimer(timer, T0 + 90_000);
    expect(derived.elapsedMs).toBe(30_000);
    expect(derived.remainingMs).toBe(0);
    expect(derived.progress).toBe(0);
    expect(derived.isComplete).toBe(true);
  });

  it('excludes paused time from elapsed', () => {
    let timer = createTimer(100, T0);
    // run 20s, pause at T0+20s
    timer = pauseTimer(timer, T0 + 20_000);
    // still paused 40s later — elapsed stays 20s
    expect(getElapsedMs(timer, T0 + 60_000)).toBe(20_000);
    expect(deriveTimer(timer, T0 + 60_000).isPaused).toBe(true);

    // resume at T0+60s, then run another 10s
    timer = resumeTimer(timer, T0 + 60_000);
    expect(timer.pausedTotalMs).toBe(40_000);
    expect(timer.pauseStartedAtMs).toBeNull();
    expect(getElapsedMs(timer, T0 + 70_000)).toBe(30_000);
  });
});

describe('pauseTimer / resumeTimer', () => {
  it('is idempotent when already paused or already running', () => {
    const running = createTimer(60, T0);
    expect(resumeTimer(running, T0 + 1000)).toEqual(running);

    const paused = pauseTimer(running, T0 + 1000);
    expect(pauseTimer(paused, T0 + 2000)).toEqual(paused);
  });
});

describe('addDurationSeconds', () => {
  it('extends planned duration', () => {
    const timer = createTimer(60, T0);
    expect(addDurationSeconds(timer, 300).durationSeconds).toBe(360);
    expect(addDurationSeconds(timer, 0)).toEqual(timer);
  });
});

describe('formatClock', () => {
  it('formats MM:SS and H:MM:SS', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(65)).toBe('01:05');
    expect(formatClock(3661)).toBe('1:01:01');
  });
});
