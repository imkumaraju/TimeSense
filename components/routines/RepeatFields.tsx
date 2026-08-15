import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';

import { TsSectionLabel } from '@/components/ui/TsSectionLabel';
import { colors, fonts } from '@/constants/theme';
import { formatReminderTime } from '@/lib/routineLogic';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export type RepeatFieldsValue = {
  recurrenceDays: number[];
  reminderHour: number;
  reminderMinute: number;
  endMode: 'ongoing' | 'date';
  endDate: Date;
};

type Props = {
  value: RepeatFieldsValue;
  onChange: (next: RepeatFieldsValue) => void;
};

/** Day picker + reminder time + Ends control shared by New Timer's Repeat toggle and Edit Routine. */
export function RepeatFields({ value, onChange }: Props) {
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const toggleDay = (day: number) => {
    const days = value.recurrenceDays.includes(day)
      ? value.recurrenceDays.filter((d) => d !== day)
      : [...value.recurrenceDays, day].sort();
    onChange({ ...value, recurrenceDays: days });
  };

  return (
    <View>
      <TsSectionLabel>On these days</TsSectionLabel>
      <View style={styles.dayRow}>
        {DAY_LABELS.map((label, day) => (
          <Pressable
            key={day}
            style={[
              styles.dayChip,
              value.recurrenceDays.includes(day) && styles.dayChipActive,
            ]}
            onPress={() => toggleDay(day)}
            accessibilityRole="button"
            accessibilityState={{ selected: value.recurrenceDays.includes(day) }}>
            <Text
              style={[
                styles.dayChipText,
                value.recurrenceDays.includes(day) && styles.dayChipTextActive,
              ]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      <TsSectionLabel>Reminder time</TsSectionLabel>
      <Pressable
        style={styles.input}
        onPress={() => setShowTimePicker(true)}
        accessibilityRole="button">
        <Text style={{ fontFamily: fonts.body, color: colors.ink }}>
          {formatReminderTime(value.reminderHour, value.reminderMinute)}
        </Text>
      </Pressable>
      {showTimePicker ? (
        <DateTimePicker
          mode="time"
          value={(() => {
            const d = new Date();
            d.setHours(value.reminderHour, value.reminderMinute, 0, 0);
            return d;
          })()}
          onChange={(_event, selected) => {
            setShowTimePicker(Platform.OS === 'ios');
            if (selected) {
              onChange({
                ...value,
                reminderHour: selected.getHours(),
                reminderMinute: selected.getMinutes(),
              });
            }
          }}
        />
      ) : null}

      <TsSectionLabel>Ends</TsSectionLabel>
      <View style={styles.segmented}>
        <Pressable
          style={[styles.seg, value.endMode === 'ongoing' && styles.segActive]}
          onPress={() => onChange({ ...value, endMode: 'ongoing' })}>
          <Text
            style={[
              styles.segText,
              value.endMode === 'ongoing' && styles.segTextActive,
            ]}>
            Ongoing
          </Text>
        </Pressable>
        <Pressable
          style={[styles.seg, value.endMode === 'date' && styles.segActive]}
          onPress={() => onChange({ ...value, endMode: 'date' })}>
          <Text
            style={[styles.segText, value.endMode === 'date' && styles.segTextActive]}>
            On a date
          </Text>
        </Pressable>
      </View>
      {value.endMode === 'date' ? (
        <Pressable
          style={styles.input}
          onPress={() => setShowEndPicker(true)}
          accessibilityRole="button">
          <Text style={{ fontFamily: fonts.body, color: colors.ink }}>
            {value.endDate.toLocaleDateString()}
          </Text>
        </Pressable>
      ) : null}
      {showEndPicker ? (
        <DateTimePicker
          mode="date"
          value={value.endDate}
          minimumDate={new Date(Date.now() + 24 * 60 * 60 * 1000)}
          onChange={(_event, selected) => {
            setShowEndPicker(Platform.OS === 'ios');
            if (selected) onChange({ ...value, endDate: selected });
          }}
        />
      ) : null}
    </View>
  );
}

export function defaultEndDate(): Date {
  const d = new Date();
  d.setMonth(d.getMonth() + 3);
  return d;
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.cream,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: fonts.body,
    color: colors.ink,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  dayChip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayChipActive: {
    backgroundColor: colors.crust,
    borderColor: colors.crust,
  },
  dayChipText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.muted,
  },
  dayChipTextActive: {
    color: colors.board,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 3,
    marginBottom: 10,
  },
  seg: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
  },
  segActive: {
    backgroundColor: colors.crust,
  },
  segText: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: colors.muted,
  },
  segTextActive: {
    color: colors.board,
  },
});
