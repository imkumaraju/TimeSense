import {
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { colors, fonts } from '@/constants/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'secondaryOnDark';

type Props = PressableProps & {
  label: string;
  variant?: Variant;
  block?: boolean;
  textStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
};

export function TsButton({
  label,
  variant = 'primary',
  block,
  disabled,
  textStyle,
  style,
  ...rest
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'secondaryOnDark' && styles.secondaryOnDark,
        variant === 'ghost' && styles.ghost,
        block && styles.block,
        (pressed || disabled) && styles.pressed,
        style,
      ]}
      {...rest}>
      <Text
        style={[
          styles.label,
          variant === 'primary' && styles.labelPrimary,
          variant === 'secondary' && styles.labelSecondary,
          variant === 'secondaryOnDark' && styles.labelOnDark,
          variant === 'ghost' && styles.labelGhost,
          textStyle,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  block: { width: '100%' },
  primary: { backgroundColor: colors.sauce },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.crustDark,
  },
  secondaryOnDark: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.crust,
  },
  ghost: {
    backgroundColor: 'transparent',
    paddingVertical: 8,
  },
  pressed: { opacity: 0.7 },
  label: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
  },
  labelPrimary: { color: colors.cream },
  labelSecondary: { color: colors.crustDark },
  labelOnDark: { color: colors.cheese },
  labelGhost: {
    color: colors.muted,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});
