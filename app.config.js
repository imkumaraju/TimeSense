/**
 * Multi-env Expo config. Native IDs + URL scheme follow APP_ENV
 * (set by eas.json build profiles, or locally before `expo start`).
 *
 *   APP_ENV=development → com.timesense.dev  / timesense-dev
 *   APP_ENV=preview     → com.timesense.sys  / timesense-sys  (sys/staging)
 *   APP_ENV=production  → com.timesense      / timesense
 *
 * Defaults to development so local `npx expo start` stays on the dev app.
 */

const EAS_PROJECT_ID = 'c1c68318-e26c-477f-8074-b4cba4e48901';

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
    name: 'TimeSense Staging',
    bundleId: 'com.timesense.sys',
    scheme: 'timesense-sys',
  },
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
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    package: env.bundleId,
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
        backgroundColor: '#ffffff',
      },
    ],
    'expo-sqlite',
    'expo-apple-authentication',
    [
      'expo-notifications',
      {
        icon: './assets/images/icon.png',
        color: '#2A9D8F',
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
