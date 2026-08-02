import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TsCard } from '@/components/ui/TsCard';
import { TsChip } from '@/components/ui/TsChip';
import { colors, fonts } from '@/constants/theme';
import { listRecentTasks } from '@/lib/tasksDb';
import type { Task, TaskCategory } from '@/types/task';

type Range = 'month' | 'all';

type CatStat = {
  category: string;
  predictedAvgMin: number;
  actualAvgMin: number;
};

const CATEGORY_LABELS: Record<string, string> = {
  chores: 'Chores',
  work: 'Work',
  study: 'Study',
  errands: 'Errands',
  creative: 'Creative',
  other: 'Other',
};

function inRange(task: Task, range: Range): boolean {
  if (range === 'all') return true;
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  return task.startedAt >= start.getTime();
}

function buildStats(tasks: Task[], range: Range): CatStat[] {
  const done = tasks.filter(
    (t) => t.actualSeconds != null && inRange(t, range),
  );
  const byCat = new Map<string, { p: number[]; a: number[] }>();
  for (const t of done) {
    const key = (t.category as TaskCategory | null) ?? 'other';
    const bucket = byCat.get(key) ?? { p: [], a: [] };
    bucket.p.push(t.predictedSeconds);
    bucket.a.push(t.actualSeconds!);
    byCat.set(key, bucket);
  }
  return Array.from(byCat.entries()).map(([category, { p, a }]) => ({
    category,
    predictedAvgMin:
      p.reduce((s, n) => s + n, 0) / p.length / 60,
    actualAvgMin: a.reduce((s, n) => s + n, 0) / a.length / 60,
  }));
}

function insightLine(stats: CatStat[]): string | null {
  if (stats.length === 0) return null;
  let worst: CatStat | null = null;
  let worstPct = 0;
  for (const s of stats) {
    if (s.predictedAvgMin <= 0) continue;
    const pct =
      ((s.actualAvgMin - s.predictedAvgMin) / s.predictedAvgMin) * 100;
    if (pct > worstPct) {
      worstPct = pct;
      worst = s;
    }
  }
  if (!worst || worstPct < 10) {
    return 'Your predictions are tracking closely — keep logging.';
  }
  const label = CATEGORY_LABELS[worst.category] ?? worst.category;
  return `You tend to underestimate ${label} by ~${Math.round(worstPct)}%.`;
}

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const [range, setRange] = useState<Range>('month');
  const [tasks, setTasks] = useState<Task[]>([]);

  useFocusEffect(
    useCallback(() => {
      void listRecentTasks(200).then(setTasks);
    }, []),
  );

  const stats = useMemo(() => buildStats(tasks, range), [tasks, range]);
  const maxMin = Math.max(
    1,
    ...stats.flatMap((s) => [s.predictedAvgMin, s.actualAvgMin]),
  );
  const insight = insightLine(stats);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 },
      ]}>
      <Text style={styles.title}>Your patterns</Text>

      <View style={styles.chips}>
        <TsChip
          label="This month"
          active={range === 'month'}
          onPress={() => setRange('month')}
        />
        <TsChip
          label="All time"
          active={range === 'all'}
          onPress={() => setRange('all')}
        />
      </View>

      <TsCard>
        <Text style={styles.cardTitle}>Predicted vs. actual</Text>
        {stats.length === 0 ? (
          <Text style={styles.empty}>
            Finish a few timers to see calibration by category.
          </Text>
        ) : (
          <View style={styles.chart}>
            {stats.slice(0, 4).map((s) => (
              <View key={s.category} style={styles.barGroup}>
                <View style={styles.bars}>
                  <View
                    style={[
                      styles.bar,
                      styles.barPredicted,
                      {
                        height: Math.max(
                          4,
                          (s.predictedAvgMin / maxMin) * 90,
                        ),
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.bar,
                      styles.barActual,
                      {
                        height: Math.max(4, (s.actualAvgMin / maxMin) * 90),
                      },
                    ]}
                  />
                </View>
                <Text style={styles.barLabel}>
                  {CATEGORY_LABELS[s.category] ?? s.category}
                </Text>
              </View>
            ))}
          </View>
        )}
        <View style={styles.legend}>
          <Text style={styles.legendItem}>
            <Text style={{ color: colors.crust }}>█ </Text>Predicted
          </Text>
          <Text style={styles.legendItem}>
            <Text style={{ color: colors.sauce }}>█ </Text>Actual
          </Text>
        </View>
      </TsCard>

      {insight ? (
        <TsCard style={styles.insightCard}>
          <Text style={styles.insightText}>{insight}</Text>
        </TsCard>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.plate,
  },
  content: {
    paddingHorizontal: 20,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: colors.ink,
    marginBottom: 14,
  },
  chips: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  cardTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.ink,
    marginBottom: 12,
  },
  empty: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    height: 120,
    marginBottom: 10,
  },
  barGroup: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 90,
    width: '100%',
    justifyContent: 'center',
  },
  bar: {
    width: 12,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    minHeight: 4,
  },
  barPredicted: { backgroundColor: colors.crust },
  barActual: { backgroundColor: colors.sauce },
  barLabel: {
    marginTop: 6,
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.muted,
  },
  legend: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  legendItem: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.muted,
  },
  insightCard: {
    marginTop: 12,
    backgroundColor: colors.insightCard,
  },
  insightText: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
  },
});
