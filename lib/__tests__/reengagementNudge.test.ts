import { computeReentryNudgeDate } from '@/lib/reengagementNudge';

describe('computeReentryNudgeDate', () => {
  it('defaults to 3 days out at 11:00 local', () => {
    const now = new Date(2026, 7, 15, 9, 30, 0); // Aug 15, 9:30am
    const fireDate = computeReentryNudgeDate(now);
    expect(fireDate.getFullYear()).toBe(2026);
    expect(fireDate.getMonth()).toBe(7);
    expect(fireDate.getDate()).toBe(18);
    expect(fireDate.getHours()).toBe(11);
    expect(fireDate.getMinutes()).toBe(0);
  });

  it('respects custom days/hour', () => {
    const now = new Date(2026, 7, 15, 9, 30, 0);
    const fireDate = computeReentryNudgeDate(now, 5, 18);
    expect(fireDate.getDate()).toBe(20);
    expect(fireDate.getHours()).toBe(18);
  });

  it('rolls over month boundaries correctly', () => {
    const now = new Date(2026, 7, 30, 9, 30, 0); // Aug 30
    const fireDate = computeReentryNudgeDate(now, 3, 11);
    expect(fireDate.getMonth()).toBe(8); // September
    expect(fireDate.getDate()).toBe(2);
  });
});
