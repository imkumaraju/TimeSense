import { StyleSheet, Text, type TextProps } from 'react-native';

import { colors, fonts } from '@/constants/theme';

export function TsSectionLabel({ style, ...rest }: TextProps) {
  return <Text style={[styles.label, style]} {...rest} />;
}

const styles = StyleSheet.create({
  label: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.muted,
    marginBottom: 8,
  },
});
