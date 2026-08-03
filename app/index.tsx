import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';

import { colors } from '@/constants/theme';
import { shouldShowShowcaseToday } from '@/lib/showcaseGate';

/**
 * Entry gate: daily style showcase or straight to Home.
 */
export default function IndexGate() {
  const [href, setHref] = useState<'/showcase' | '/(tabs)' | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const show = await shouldShowShowcaseToday();
      if (alive) setHref(show ? '/showcase' : '/(tabs)');
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (!href) {
    return <View style={styles.boot} />;
  }

  return <Redirect href={href} />;
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: colors.board,
  },
});
