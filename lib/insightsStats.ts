/**
 * On-device calibration stats for Insights. Deterministic — no AI.
 */

import type { Task } from '@/types/task';

export type InsightsRange = 'week' | 'month' | 'all';

export type CatStat = {
  category: string;
  count: number;
  predictedAvgMin: number;
  actualAvgMin: number;
  /** (actual - predicted) / predicted as percent. */
  biasPct: number;
};

export type InsightCard = {
  id: string;
  text: string;
};

export const CATEGORY_LABELS: Record<string, string> = {
  chores: 'Chores',
  work: 'Work',
  study: 'Study',
  errands: 'Errands',
  creative: 'Creative',
  other: 'Other',
};

export function categoryLabel(key: string): string {
  return CATEGORY_LABELS[key] ?? key;
}

export function inRange(
  task: Task,
  range: InsightsRange,
  nowMs: number = Date.now(),
): boolean {
  if (range === 'all') return true;
  const start = new Date(nowMs);
  start.setHours(0, 0, 0, 0);
  if (range === 'week') {
    const day = start.getDay(); // 0 Sun
    const mondayOffset = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + mondayOffset);
  } else {
    start.setDate(1);
  }
  return task.startedAt >= start.getTime();
}

const MIN_SAMPLES = 2;

export function buildCategoryStats(
  tasks: Task[],
  range: InsightsRange,
  nowMs: number = Date.now(),
): CatStat[] {
  const done = tasks.filter(
    (t) => t.actualSeconds != null && inRange(t, range, nowMs),
  );
  const byCat = new Map<string, { p: number[]; a: number[] }>();
  for (const t of done) {
    const key = t.category ?? 'other';
    const bucket = byCat.get(key) ?? { p: [], a: [] };
    bucket.p.push(t.predictedSeconds);
    bucket.a.push(t.actualSeconds!);
    byCat.set(key, bucket);
  }

  return Array.from(byCat.entries())
    .map(([category, { p, a }]) => {
      const predictedAvgMin =
        p.reduce((s, n) => s + n, 0) / p.length / 60;
      const actualAvgMin = a.reduce((s, n) => s + n, 0) / a.length / 60;
      const biasPct =
        predictedAvgMin <= 0
          ? 0
          : ((actualAvgMin - predictedAvgMin) / predictedAvgMin) * 100;
      return {
        category,
        count: p.length,
        predictedAvgMin,
        actualAvgMin,
        biasPct,
      };
    })
    .sort((a, b) => Math.abs(b.biasPct) - Math.abs(a.biasPct));
}

export function buildInsightCards(stats: CatStat[]): InsightCard[] {
  const eligible = stats.filter((s) => s.count >= MIN_SAMPLES);
  if (eligible.length === 0) {
    if (stats.length === 0) return [];
    return [
      {
        id: 'need-more',
        text: 'Finish a couple more timers in the same category to unlock clearer patterns.',
      },
    ];
  }

  const cards: InsightCard[] = [];

  let sumBias = 0;
  let weight = 0;
  for (const s of eligible) {
    sumBias += s.biasPct * s.count;
    weight += s.count;
  }
  const overall = weight > 0 ? sumBias / weight : 0;
  if (Math.abs(overall) < 10) {
    cards.push({
      id: 'overall',
      text: 'Your predictions are tracking closely overall — keep logging.',
    });
  } else if (overall > 0) {
    cards.push({
      id: 'overall',
      text: `Overall you tend to underestimate by ~${Math.round(overall)}%.`,
    });
  } else {
    cards.push({
      id: 'overall',
      text: `Overall you tend to overestimate by ~${Math.round(Math.abs(overall))}%.`,
    });
  }

  let under: CatStat | null = null;
  let over: CatStat | null = null;
  for (const s of eligible) {
    if (s.biasPct >= 10 && (!under || s.biasPct > under.biasPct)) under = s;
    if (s.biasPct <= -10 && (!over || s.biasPct < over.biasPct)) over = s;
  }

  if (under) {
    cards.push({
      id: 'under',
      text: `You tend to underestimate ${categoryLabel(under.category)} by ~${Math.round(under.biasPct)}%.`,
    });
  }
  if (over) {
    cards.push({
      id: 'over',
      text: `You tend to overestimate ${categoryLabel(over.category)} by ~${Math.round(Math.abs(over.biasPct))}%.`,
    });
  }

  return cards;
}
