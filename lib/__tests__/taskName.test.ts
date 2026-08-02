import { defaultTaskName, resolveTaskName } from '@/lib/taskName';

describe('resolveTaskName', () => {
  it('uses timestamp title when name is blank', () => {
    const at = Date.parse('2026-08-01T12:03:00');
    expect(resolveTaskName(null, at)).toBe(defaultTaskName(at));
    expect(resolveTaskName('   ', at)).toBe(defaultTaskName(at));
    expect(defaultTaskName(at)).toMatch(/^Timer · /);
  });

  it('keeps a user-provided name', () => {
    expect(resolveTaskName('Clean kitchen')).toBe('Clean kitchen');
  });
});
