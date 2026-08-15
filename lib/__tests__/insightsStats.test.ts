import {
  buildCategoryStats,
  buildInsightCards,
  inRange,
} from '@/lib/insightsStats';
import type { Task } from '@/types/task';

const T0 = Date.parse('2026-08-05T12:00:00.000Z'); // Wednesday

function task(
  partial: Partial<Task> & Pick<Task, 'id' | 'predictedSeconds' | 'actualSeconds' | 'startedAt'>,
): Task {
  return {
    userId: null,
    name: 't',
    description: null,
    category: 'work',
    visualStyle: 'pizza',
    endedAt: partial.startedAt,
    moodTag: null,
    createdAt: partial.startedAt,
    updatedAt: partial.startedAt,
    synced: false,
    ...partial,
  };
}

describe('inRange', () => {
  it('includes tasks from this week only', () => {
    const monday = Date.parse('2026-08-03T08:00:00.000Z');
    const lastWeek = Date.parse('2026-07-28T08:00:00.000Z');
    expect(inRange(task({ id: '1', predictedSeconds: 60, actualSeconds: 60, startedAt: monday }), 'week', T0)).toBe(true);
    expect(inRange(task({ id: '2', predictedSeconds: 60, actualSeconds: 60, startedAt: lastWeek }), 'week', T0)).toBe(false);
  });
});

describe('buildCategoryStats / buildInsightCards', () => {
  it('computes bias and prefers categories with enough samples', () => {
    const tasks = [
      task({
        id: '1',
        category: 'chores',
        predictedSeconds: 60 * 60,
        actualSeconds: 90 * 60,
        startedAt: T0,
      }),
      task({
        id: '2',
        category: 'chores',
        predictedSeconds: 60 * 60,
        actualSeconds: 90 * 60,
        startedAt: T0 + 1000,
      }),
      task({
        id: '3',
        category: 'work',
        predictedSeconds: 60 * 60,
        actualSeconds: 30 * 60,
        startedAt: T0 + 2000,
      }),
      task({
        id: '4',
        category: 'work',
        predictedSeconds: 60 * 60,
        actualSeconds: 30 * 60,
        startedAt: T0 + 3000,
      }),
    ];
    const stats = buildCategoryStats(tasks, 'all', T0);
    expect(stats.find((s) => s.category === 'chores')?.biasPct).toBeCloseTo(50);
    expect(stats.find((s) => s.category === 'work')?.biasPct).toBeCloseTo(-50);

    const cards = buildInsightCards(stats);
    expect(cards.some((c) => c.id === 'under')).toBe(true);
    expect(cards.some((c) => c.id === 'over')).toBe(true);
  });
});
