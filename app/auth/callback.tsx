import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as Linking from 'expo-linking';

import { useAuthStore } from '@/stores/authStore';

/**
 * Deep-link landing route for OAuth / magic-link redirects (`timesense://auth/callback`).
 */
export default function AuthCallbackScreen() {
  const handleAuthUrl = useAuthStore((s) => s.handleAuthUrl);
  const params = useLocalSearchParams();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const url = await Linking.getInitialURL();
      // Expo Router may also surface tokens as search params on this route.
      const fromParams =
        typeof params.access_token === 'string'
          ? `timesense://auth/callback#access_token=${params.access_token}&refresh_token=${params.refresh_token ?? ''}`
          : null;

      const target = url ?? fromParams;
      if (!target) {
        router.replace('/auth');
        return;
      }

      const ok = await handleAuthUrl(target);
      if (cancelled) return;
      router.replace(ok ? '/' : '/auth');
    })();

    return () => {
      cancelled = true;
    };
  }, [handleAuthUrl, params.access_token, params.refresh_token]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#2A9D8F" />
      <Text style={styles.text}>Finishing sign-in…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F4EF',
    gap: 12,
  },
  text: {
    color: '#1D3557',
    fontSize: 15,
  },
});
