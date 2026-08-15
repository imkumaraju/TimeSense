import { remoteProfileToLocal } from '@/lib/syncMappers';

describe('remoteProfileToLocal deletedAt', () => {
  it('maps deleted_at onto Profile.deletedAt', () => {
    const local = remoteProfileToLocal({
      id: 'u1',
      display_name: 'Ada',
      username: 'ada',
      first_name: 'Ada',
      last_name: 'Lovelace',
      timezone: 'UTC',
      default_visual_style: 'pizza',
      streak_count: 2,
      freezes_available: 1,
      last_active_date: '2026-08-01',
      deleted_at: '2026-08-08T10:00:00.000Z',
    });
    expect(local.deletedAt).toBe('2026-08-08T10:00:00.000Z');
  });

  it('treats missing deleted_at as active', () => {
    const local = remoteProfileToLocal({
      id: 'u1',
      display_name: null,
      username: null,
      first_name: null,
      last_name: null,
      timezone: null,
      default_visual_style: null,
      streak_count: null,
      freezes_available: null,
      last_active_date: null,
      deleted_at: null,
    });
    expect(local.deletedAt).toBeNull();
  });
});
