import {
  Fraunces_600SemiBold,
  Fraunces_700Bold,
  Fraunces_900Black,
} from '@expo-google-fonts/fraunces';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { ThemeProvider, DefaultTheme } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { router, Stack } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { colors } from '@/constants/theme';
import { initPurchases, syncPurchasesIdentity } from '@/lib/purchases';
import { ensureReentryNudge } from '@/lib/reengagementNudge';
import { cancelExpiredRoutineNotifications } from '@/lib/routineNotifications';
import {
  ensureLastChanceWidgetTrigger,
  recomputeAndWriteWidgetSnapshot,
} from '@/lib/widgetSnapshot';
import { useAuthStore } from '@/stores/authStore';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
};

SplashScreen.preventAutoHideAsync().catch(() => {});

// Crash reporting: only report from preview/production builds, never local dev.
const appEnv = Constants.expoConfig?.extra?.appEnv;
const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
if (sentryDsn && appEnv !== 'development') {
  Sentry.init({
    dsn: sentryDsn,
    environment: appEnv,
    tracesSampleRate: 0,
  });
}

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.sauce,
    background: colors.plate,
    card: colors.cream,
    text: colors.ink,
    border: colors.border,
    notification: colors.sauce,
  },
};

export default Sentry.wrap(RootLayout);

function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const user = useAuthStore((s) => s.user);
  const [fontsLoaded] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    Fraunces_900Black,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    return hydrate();
  }, [hydrate]);

  useEffect(() => {
    void cancelExpiredRoutineNotifications();
  }, []);

  useEffect(() => {
    void ensureReentryNudge();
  }, []);

  useEffect(() => {
    initPurchases();
  }, []);

  useEffect(() => {
    syncPurchasesIdentity(user?.id ?? null);
  }, [user?.id]);

  useEffect(() => {
    void recomputeAndWriteWidgetSnapshot(user?.id ?? null);
    void ensureLastChanceWidgetTrigger();
  }, [user?.id]);

  useEffect(() => {
    // A routine's reminder notification firing is itself the "we've reached reminder time"
    // signal (§10.6) — piggyback the widget recompute on it. Combined with the silent daily
    // trigger scheduled above for the Last Chance boundary, both mood transitions now refresh
    // the widget while the app is closed.
    const sub = Notifications.addNotificationReceivedListener(() => {
      void recomputeAndWriteWidgetSnapshot(user?.id ?? null);
    });
    return () => sub.remove();
  }, [user?.id]);

  useEffect(() => {
    // Tapping a routine reminder deep-links into New Timer prefilled for that routine (§10.7),
    // same destination as the widget's OPEN_URI tap. `timer/new` resolves routineId itself.
    const openForResponse = (response: Notifications.NotificationResponse | null) => {
      const routineId = response?.notification.request.content.data?.routineId;
      if (typeof routineId === 'string') {
        router.push({ pathname: '/timer/new', params: { routineId } });
      }
    };
    void Notifications.getLastNotificationResponseAsync().then(openForResponse);
    const sub = Notifications.addNotificationResponseReceivedListener(openForResponse);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <ThemeProvider value={navTheme}>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="showcase" options={{ headerShown: false, animation: 'fade' }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
          <Stack.Screen
            name="auth/index"
            options={{ title: 'Account', presentation: 'modal', headerShown: false }}
          />
          <Stack.Screen
            name="auth/callback"
            options={{ headerShown: false, presentation: 'modal' }}
          />
          <Stack.Screen
            name="timer-preview"
            options={{ title: 'Timer preview', presentation: 'modal' }}
          />
          <Stack.Screen
            name="paywall"
            options={{ title: 'TimeSense Plus', presentation: 'modal' }}
          />
          <Stack.Screen
            name="timer/active"
            options={{ headerShown: false, animation: 'fade' }}
          />
          <Stack.Screen
            name="timer/new"
            options={{ headerShown: false, presentation: 'modal' }}
          />
          <Stack.Screen
            name="timer/complete"
            options={{ headerShown: false, animation: 'fade' }}
          />
          <Stack.Screen
            name="routines/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="routines/[id]"
            options={{ headerShown: false, presentation: 'modal' }}
          />
          <Stack.Screen
            name="legal/privacy"
            options={{ title: 'Privacy Policy' }}
          />
          <Stack.Screen
            name="legal/terms"
            options={{ title: 'Terms & Conditions' }}
          />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
