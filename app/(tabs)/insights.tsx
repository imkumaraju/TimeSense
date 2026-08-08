import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TsCard } from '@/components/ui/TsCard';
import { TsChip } from '@/components/ui/TsChip';
import { colors, fonts } from '@/constants/theme';
import {
  buildCategoryStats,
  buildInsightCards,
  categoryLabel,
  type InsightsRange,
} from '@/lib/insightsStats';
import { listRecentTasks } from '@/lib/tasksDb';
import type { Task } from '@/types/task';

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const [range, setRange] = useState<InsightsRange>('month');
  const [tasks, setTasks] = useState<Task[]>([]);

  useFocusEffect(
    useCallback(() => {
      void listRecentTasks(200).then(setTasks);
    }, []),
  );

  const stats = useMemo(() => buildCategoryStats(tasks, range), [tasks, range]);
  const cards = useMemo(() => buildInsightCards(stats), [stats]);
  const maxMin = Math.max(
    1,
    ...stats.flatMap((s) => [s.predictedAvgMin, s.actualAvgMin]),
  );

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
          label="This week"
          active={range === 'week'}
          onPress={() => setRange('week')}
        />
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
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chart}>
            {stats.map((s) => (
              <View key={s.category} style={styles.barGroup}>
                <Text style={styles.biasLabel}>
                  {s.biasPct >= 0 ? '+' : ''}
                  {Math.round(s.biasPct)}%
                </Text>
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
                  {categoryLabel(s.category)}
                </Text>
                <Text style={styles.barMeta}>
                  {Math.round(s.predictedAvgMin)}m → {Math.round(s.actualAvgMin)}
                  m
                </Text>
              </View>
            ))}
          </ScrollView>
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

      {cards.map((card) => (
        <TsCard key={card.id} style={styles.insightCard}>
          <Text style={styles.insightText}>{card.text}</Text>
        </TsCard>
      ))}
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
    flexWrap: 'wrap',
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
    gap: 14,
    minHeight: 150,
    paddingBottom: 4,
  },
  barGroup: {
    width: 72,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  biasLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.muted,
    marginBottom: 4,
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
    color: colors.ink,
    textAlign: 'center',
  },
  barMeta: {
    marginTop: 2,
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.muted,
    textAlign: 'center',
  },
  legend: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 10,
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
