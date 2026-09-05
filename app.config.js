/**
 * Multi-env Expo config. Native IDs + URL scheme follow APP_ENV
 * (set by eas.json build profiles, or locally before `expo start`).
 *
 *   APP_ENV=development → com.timesense.dev  / timesense-dev  (dev)
 *   APP_ENV=preview     → com.timesense.sys  / timesense-sys  (PRODUCTION — real users, Play Store)
 *   APP_ENV=production  → com.timesense      / timesense      (dormant — future 3rd tier, not built)
 *
 * 2-tier setup: `sys` (APP_ENV=preview) is production. `production` config below is kept
 * unused so a real 3rd tier can be added later without restructuring this file.
 *
 * Defaults to development so local `npx expo start` stays on the dev app.
 */

const EAS_PROJECT_ID = 'c1c68318-e26c-477f-8074-b4cba4e48901';

// Google's official public test AdMob app IDs — safe to ship as the default since they only
// ever serve Google's test creatives, never real ads. Swap in real app IDs (from your own
// AdMob account, one per platform) via these env vars once TimeSense Plus's ad-supported free
// tier is ready to go live with real inventory — see lib/ads.ts.
const ADMOB_ANDROID_APP_ID =
  process.env.ADMOB_ANDROID_APP_ID ?? 'ca-app-pub-3940256099942544~3347511713';
const ADMOB_IOS_APP_ID =
  process.env.ADMOB_IOS_APP_ID ?? 'ca-app-pub-3940256099942544~1458002511';

/** @typedef {'development' | 'preview' | 'production'} AppEnv */

/**
 * @param {string | undefined} raw
 * @returns {AppEnv}
 */
function resolveAppEnv(raw) {
  const value = (raw ?? 'development').toLowerCase().trim();
  if (value === 'production' || value === 'prod' || value === 'main') {
    return 'production';
  }
  if (value === 'preview' || value === 'sys' || value === 'staging') {
    return 'preview';
  }
  return 'development';
}

/** @type {Record<AppEnv, { name: string; bundleId: string; scheme: string }>} */
const ENV_CONFIG = {
  development: {
    name: 'TimeSense Dev',
    bundleId: 'com.timesense.dev',
    scheme: 'timesense-dev',
  },
  preview: {
    name: 'TimeSense',
    bundleId: 'com.timesense.sys',
    scheme: 'timesense-sys',
  },
  // Dormant — future 3rd tier, not currently built or deployed.
  production: {
    name: 'TimeSense',
    bundleId: 'com.timesense',
    scheme: 'timesense',
  },
};

const appEnv = resolveAppEnv(process.env.APP_ENV);
const env = ENV_CONFIG[appEnv];

/** @type {import('expo/config').ExpoConfig} */
const config = {
  name: env.name,
  slug: 'timesense',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: env.scheme,
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: true,
    bundleIdentifier: env.bundleId,
    usesAppleSignIn: true,
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#D98A3D',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    package: env.bundleId,
    // POST_NOTIFICATIONS (Android 13+) is also auto-added by the
    // expo-notifications plugin below; declared explicitly so it's visible
    // here for Play Console's permissions review. No exact-alarm permission:
    // routine reminders are recurring WEEKLY triggers, not time-critical
    // exact alarms, so SCHEDULE_EXACT_ALARM is intentionally not requested.
    permissions: ['android.permission.POST_NOTIFICATIONS'],
    intentFilters: [
      {
        action: 'VIEW',
        category: ['BROWSABLE', 'DEFAULT'],
        data: [
          {
            scheme: env.scheme,
            host: '*',
          },
        ],
      },
    ],
  },
  web: {
    bundler: 'metro',
    output: 'single',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        resizeMode: 'contain',
        backgroundColor: '#FFF8EC',
      },
    ],
    'expo-sqlite',
    'expo-video',
    'expo-apple-authentication',
    '@react-native-community/datetimepicker',
    [
      'expo-notifications',
      {
        icon: './assets/images/icon.png',
        color: '#D98A3D',
      },
    ],
    '@sentry/react-native',
    [
      'react-native-google-mobile-ads',
      {
        androidAppId: ADMOB_ANDROID_APP_ID,
        iosAppId: ADMOB_IOS_APP_ID,
      },
    ],
    [
      'react-native-android-widget',
      {
        widgets: [
          {
            name: 'Routine',
            label: 'TimeSense Routine',
            description: 'Today’s routine status, at a glance.',
            // Default placement is the smallest reasonable footprint (1x1 cell) — was 2x2,
            // which took up roughly two rows of home-screen icons. Still resizable up to
            // maxResize if a user wants it bigger.
            minWidth: '60dp',
            minHeight: '60dp',
            targetCellWidth: 1,
            targetCellHeight: 1,
            maxResizeWidth: '250dp',
            maxResizeHeight: '250dp',
            resizeMode: 'horizontal|vertical',
            updatePeriodMillis: 1800000,
          },
        ],
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    router: {},
    appEnv,
    eas: {
      projectId: EAS_PROJECT_ID,
    },
  },
  owner: 'raju003',
};

module.exports = config;
