import { StyleSheet, View, type ViewProps } from 'react-native';

import { colors } from '@/constants/theme';

export function TsCard({ style, ...rest }: ViewProps) {
  return <View style={[styles.card, style]} {...rest} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cream,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
});
