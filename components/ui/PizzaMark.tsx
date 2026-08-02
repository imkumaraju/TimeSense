import { StyleSheet, View } from 'react-native';

import { colors } from '@/constants/theme';

/** Small pizza mark used on Auth / branding. */
export function PizzaMark({ size = 56 }: { size?: number }) {
  const inner = size * 0.55;
  const pepperoni = size * 0.12;
  return (
    <View
      style={[
        styles.crust,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: size * 0.055,
        },
      ]}>
      <View
        style={[
          styles.cheese,
          {
            width: inner,
            height: inner,
            borderRadius: inner / 2,
          },
        ]}
      />
      <View
        style={[
          styles.pep,
          {
            width: pepperoni,
            height: pepperoni,
            borderRadius: pepperoni / 2,
            top: size * 0.28,
            left: size * 0.28,
          },
        ]}
      />
      <View
        style={[
          styles.pep,
          {
            width: pepperoni,
            height: pepperoni,
            borderRadius: pepperoni / 2,
            top: size * 0.48,
            left: size * 0.52,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  crust: {
    backgroundColor: colors.crust,
    borderColor: colors.sauce,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cheese: {
    backgroundColor: colors.cheese,
  },
  pep: {
    position: 'absolute',
    backgroundColor: colors.sauce,
  },
});
