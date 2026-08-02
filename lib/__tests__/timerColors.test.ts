import {
  progressToColor,
} from '@/lib/timerColors';

describe('progressToColor', () => {
  it('returns green-ish at full progress and red-ish when empty', () => {
    expect(progressToColor(1).toLowerCase()).toBe('#2a9d8f');
    expect(progressToColor(0).toLowerCase()).toBe('#e76f51');
    expect(progressToColor(0.5).toLowerCase()).toBe('#e9c46a');
  });
});
