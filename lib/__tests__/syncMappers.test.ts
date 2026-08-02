import {
  isoToMs,
  msToIso,
  remoteTaskToLocal,
  taskToRemotePayload,
} from '@/lib/syncMappers';

describe('syncMappers', () => {
  it('round-trips timestamps', () => {
    const ms = Date.UTC(2026, 7, 1, 12, 0, 0);
    expect(isoToMs(msToIso(ms))).toBe(ms);
  });

  it('maps task to remote payload with user id', () => {
    const now = Date.UTC(2026, 7, 1, 12, 0, 0);
    const payload = taskToRemotePayload(
      {
        id: 'a',
        userId: null,
        name: 'Clean',
        description: null,
        category: 'chores',
        predictedSeconds: 600,
        actualSeconds: 900,
        visualStyle: 'pizza',
        startedAt: now,
        endedAt: now + 900_000,
        moodTag: 'dragged_on',
        createdAt: now,
        updatedAt: now + 900_000,
        synced: false,
      },
      'user-1',
    );
    expect(payload.user_id).toBe('user-1');
    expect(payload.predicted_seconds).toBe(600);
    expect(payload.started_at).toBe(msToIso(now));
  });

  it('maps remote task back to local shape', () => {
    const local = remoteTaskToLocal({
      id: 'a',
      user_id: 'user-1',
      name: 'Clean',
      description: null,
      category: 'chores',
      predicted_seconds: 600,
      actual_seconds: 900,
      visual_style: 'pie',
      started_at: '2026-08-01T12:00:00.000Z',
      ended_at: '2026-08-01T12:15:00.000Z',
      mood_tag: 'about_right',
      created_at: '2026-08-01T12:00:00.000Z',
      updated_at: '2026-08-01T12:15:00.000Z',
    });
    expect(local.userId).toBe('user-1');
    expect(local.synced).toBe(true);
    expect(local.predictedSeconds).toBe(600);
  });
});
