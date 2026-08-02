/**
 * Timestamp-based timer math.
 * Never rely on a running JS interval alone — always derive elapsed from wall clock.
 *
 * Active elapsed = (now - startedAtMs) - pausedTotalMs - (now - pauseStartedAtMs if currently paused)
 */

export type TimerSnapshot = {
  /** Wall-clock ms when the timer session started (or was last resumed after reset). */
  startedAtMs: number;
  /** Planned duration in seconds. */
  durationSeconds: number;
  /** Accumulated pause duration in ms (completed pauses only). */
  pausedTotalMs: number;
  /** If set, the timer is currently paused starting at this wall-clock ms. */
  pauseStartedAtMs: number | null;
};

export type TimerDerived = {
  elapsedMs: number;
  elapsedSeconds: number;
  remainingMs: number;
  remainingSeconds: number;
  /** 1 = full time left, 0 = depleted (clamped). */
  progress: number;
  isComplete: boolean;
  isPaused: boolean;
};

export function createTimer(
  durationSeconds: number,
  nowMs: number = Date.now(),
): TimerSnapshot {
  if (durationSeconds <= 0) {
    throw new Error('durationSeconds must be > 0');
  }
  return {
    startedAtMs: nowMs,
    durationSeconds,
    pausedTotalMs: 0,
    pauseStartedAtMs: null,
  };
}

/** Total ms spent paused as of `nowMs` (includes an open pause if any). */
export function getPausedMs(timer: TimerSnapshot, nowMs: number): number {
  const openPause =
    timer.pauseStartedAtMs != null
      ? Math.max(0, nowMs - timer.pauseStartedAtMs)
      : 0;
  return timer.pausedTotalMs + openPause;
}

export function getElapsedMs(timer: TimerSnapshot, nowMs: number): number {
  const raw = nowMs - timer.startedAtMs - getPausedMs(timer, nowMs);
  return Math.max(0, raw);
}

export function deriveTimer(timer: TimerSnapshot, nowMs: number): TimerDerived {
  const durationMs = timer.durationSeconds * 1000;
  const elapsedMs = Math.min(getElapsedMs(timer, nowMs), durationMs);
  const remainingMs = Math.max(0, durationMs - elapsedMs);
  const progress = durationMs === 0 ? 0 : remainingMs / durationMs;

  return {
    elapsedMs,
    elapsedSeconds: Math.floor(elapsedMs / 1000),
    remainingMs,
    remainingSeconds: Math.ceil(remainingMs / 1000),
    progress,
    isComplete: remainingMs <= 0,
    isPaused: timer.pauseStartedAtMs != null,
  };
}

export function pauseTimer(
  timer: TimerSnapshot,
  nowMs: number = Date.now(),
): TimerSnapshot {
  if (timer.pauseStartedAtMs != null) {
    return timer;
  }
  return { ...timer, pauseStartedAtMs: nowMs };
}

export function resumeTimer(
  timer: TimerSnapshot,
  nowMs: number = Date.now(),
): TimerSnapshot {
  if (timer.pauseStartedAtMs == null) {
    return timer;
  }
  const added = Math.max(0, nowMs - timer.pauseStartedAtMs);
  return {
    ...timer,
    pausedTotalMs: timer.pausedTotalMs + added,
    pauseStartedAtMs: null,
  };
}

/** Extend the planned duration (e.g. +5 min). */
export function addDurationSeconds(
  timer: TimerSnapshot,
  extraSeconds: number,
): TimerSnapshot {
  if (extraSeconds <= 0) {
    return timer;
  }
  return {
    ...timer,
    durationSeconds: timer.durationSeconds + extraSeconds,
  };
}

/**
 * Format seconds as MM:SS for the optional digital readout.
 * Hours are included as H:MM:SS when >= 3600.
 */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  if (hours > 0) {
    return `${hours}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}
