import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { colors, fonts } from '@/constants/theme';

type Props = {
  label: string;
  /** Optional MaterialCommunityIcons glyph shown before the label. */
  icon?: ComponentProps<typeof MaterialCommunityIcons>['name'];
  active?: boolean;
  /** Requires a paid entitlement. Still tappable — onPress should route to the
   *  paywall rather than selecting, since the control stays actionable. */
  locked?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
};

export function TsChip({ label, icon, active, locked, onPress, style }: Props) {
  const tint = locked ? colors.muted : active ? colors.board : colors.muted;
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.active, locked && styles.locked, style]}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      accessibilityHint={locked ? 'Requires Plus' : undefined}>
      <View style={styles.row}>
        {icon ? (
          <MaterialCommunityIcons name={icon} size={15} color={tint} />
        ) : null}
        <Text style={[styles.text, active && styles.textActive, locked && styles.textLocked]}>
          {label}
        </Text>
        {locked ? (
          <MaterialCommunityIcons name="lock-outline" size={12} color={colors.muted} />
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.border,
  },
  active: {
    backgroundColor: colors.crust,
    borderColor: colors.crust,
  },
  locked: {
    backgroundColor: colors.cream,
    borderColor: colors.border,
    opacity: 0.6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  text: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.muted,
  },
  textActive: {
    color: colors.board,
  },
  textLocked: {
    color: colors.muted,
  },
});
