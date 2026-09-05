jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { computeWidgetMood, type MoodInputs } from '@/lib/widgetSnapshot';
import type { Routine } from '@/types/task';

function makeRoutine(overrides: Partial<Routine> = {}): Routine {
  return {
    id: 'r1',
    userId: null,
    name: 'Leg Day',
    category: null,
    predictedSeconds: 1800,
    visualStyle: 'pizza',
    recurrenceDays: '5',
    reminderHour: 18,
    reminderMinute: 0,
    startDate: '2026-08-01',
    endDate: null,
    active: true,
    createdAt: 0,
    updatedAt: 0,
    synced: true,
    deletedAt: null,
    ...overrides,
  };
}

function baseInput(overrides: Partial<MoodInputs> = {}): MoodInputs {
  return {
    dueRoutine: makeRoutine(),
    dueRoutineCompletedToday: false,
    now: new Date(2026, 7, 15, 9, 0, 0), // 9 AM, reminder at 6 PM
    ...overrides,
  };
}

describe('computeWidgetMood', () => {
  it('Calm — due today, well before reminder', () => {
    const r = computeWidgetMood(baseInput());
    expect(r.mood).toBe('calm');
    expect(r.taskLine).toBe('Leg Day · 6:00 PM');
  });

  it('Reminder — within the reminder window, not completed', () => {
    const r = computeWidgetMood(
      baseInput({ now: new Date(2026, 7, 15, 16, 0, 0) }), // 2h before 18:00
    );
    expect(r.mood).toBe('alert');
    expect(r.taskLine).toBe("Don't forget: Leg Day");
  });

  it('Last chance — within the end-of-day cutoff window', () => {
    const r = computeWidgetMood(
      baseInput({ now: new Date(2026, 7, 15, 22, 30, 0) }), // 1.5h to midnight
    );
    expect(r.mood).toBe('worried');
    expect(r.taskLine).toContain('hours left today');
  });

  it('Completed — due routine already has a completed task today', () => {
    const r = computeWidgetMood(baseInput({ dueRoutineCompletedToday: true }));
    expect(r.mood).toBe('completed');
    expect(r.taskLine).toBe('Leg Day — done!');
  });

  it('Rest day — nothing due today', () => {
    const r = computeWidgetMood(baseInput({ dueRoutine: null }));
    expect(r.mood).toBe('resting');
    expect(r.taskLine).toBe('No routines today');
  });
});
