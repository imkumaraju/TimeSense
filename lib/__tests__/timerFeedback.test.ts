jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => {}),
  notificationAsync: jest.fn(async () => {}),
  ImpactFeedbackStyle: { Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success' },
}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({
    granted: true,
    canAskAgain: true,
  })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  cancelScheduledNotificationAsync: jest.fn(async () => {}),
  scheduleNotificationAsync: jest.fn(async () => 'id'),
  SchedulableTriggerInputTypes: { TIME_INTERVAL: 'timeInterval' },
}));

jest.mock('@/lib/settings', () => ({
  getSoundHapticsEnabled: jest.fn(async () => true),
}));

import {
  applyMilestoneFlags,
  EMPTY_MILESTONE_FLAGS,
  milestoneFireAtMs,
  milestonesReached,
} from '@/lib/timerFeedback';
import {
  createTimer,
  deriveTimer,
  pauseTimer,
  resumeTimer,
} from '@/lib/timerMath';

const T0 = 1_700_000_000_000;

describe('milestoneFireAtMs', () => {
  it('schedules halfway, one minute, and complete for a long timer', () => {
    const snap = createTimer(600, T0); // 10 min
    const times = milestoneFireAtMs(snap, T0);
    expect(times.halfway).toBe(T0 + 300_000);
    expect(times.one_minute).toBe(T0 + 540_000);
    expect(times.complete).toBe(T0 + 600_000);
  });

  it('skips halfway when duration under 2 minutes', () => {
    const snap = createTimer(90, T0);
    const times = milestoneFireAtMs(snap, T0);
    expect(times.halfway).toBeNull();
    expect(times.one_minute).toBe(T0 + 30_000);
    expect(times.complete).toBe(T0 + 90_000);
  });

  it('returns nulls while paused', () => {
    const snap = pauseTimer(createTimer(600, T0), T0 + 10_000);
    const times = milestoneFireAtMs(snap, T0 + 10_000);
    expect(times.halfway).toBeNull();
    expect(times.one_minute).toBeNull();
    expect(times.complete).toBeNull();
  });

  it('accounts for completed pause time after resume', () => {
    let snap = pauseTimer(createTimer(600, T0), T0 + 60_000);
    snap = resumeTimer(snap, T0 + 120_000); // 60s paused
    const times = milestoneFireAtMs(snap, T0 + 120_000);
    expect(times.complete).toBe(T0 + 60_000 + 600_000);
  });

  it('omits milestones already in the past', () => {
    const snap = createTimer(600, T0);
    const times = milestoneFireAtMs(snap, T0 + 350_000);
    expect(times.halfway).toBeNull();
    expect(times.one_minute).toBe(T0 + 540_000);
    expect(times.complete).toBe(T0 + 600_000);
  });
});

describe('milestonesReached', () => {
  it('fires halfway once when progress crosses 0.5', () => {
    const snap = createTimer(200, T0);
    const derived = deriveTimer(snap, T0 + 100_000);
    expect(derived.progress).toBeCloseTo(0.5);
    expect(
      milestonesReached(derived, EMPTY_MILESTONE_FLAGS, 200),
    ).toEqual(['halfway']);
  });

  it('does not re-fire flagged milestones', () => {
    const snap = createTimer(200, T0);
    const derived = deriveTimer(snap, T0 + 100_000);
    const flags = applyMilestoneFlags(EMPTY_MILESTONE_FLAGS, ['halfway']);
    expect(milestonesReached(derived, flags, 200)).toEqual([]);
  });

  it('fires complete at end', () => {
    const snap = createTimer(60, T0);
    const derived = deriveTimer(snap, T0 + 60_000);
    expect(derived.isComplete).toBe(true);
    expect(
      milestonesReached(derived, EMPTY_MILESTONE_FLAGS, 60),
    ).toEqual(['complete']);
  });
});
