import type { ExpoConfig, ConfigContext } from 'expo/config';

const PRODUCTION_API_BASE = 'https://checkin-api.learnnowsyria.com';
const DEV_API_BASE = 'http://192.168.1.104:8000';
const TTLOCK_CLIENT_ID = '6515a7be0115469f90ad7b1bddbc4b5b';

const isProductionBuild =
  process.env.EXPO_PUBLIC_APP_VARIANT === 'production' ||
  process.env.EAS_BUILD_PROFILE === 'production';

const apiBase =
  process.env.EXPO_PUBLIC_API_BASE?.trim() ||
  (isProductionBuild ? PRODUCTION_API_BASE : DEV_API_BASE);
const ttlockClientId = process.env.EXPO_PUBLIC_TTLOCK_CLIENT_ID ?? TTLOCK_CLIENT_ID;

/** Dev client only for development EAS profile / local dev builds. */
const useDevClient =
  process.env.EXPO_PUBLIC_APP_VARIANT === 'development' ||
  process.env.EAS_BUILD_PROFILE === 'development';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Checkin Lock Setup',
  slug: 'checkinhousing-lock-setup',
  version: '1.0.2',
  orientation: 'default',
  scheme: 'checkin-lock-setup',
  userInterfaceStyle: 'dark',
  icon: './assets/images/icon.png',
  experiments: { typedRoutes: true },
  extra: {
    apiBase,
    appVariant: process.env.EXPO_PUBLIC_APP_VARIANT ?? 'development',
    ttlockClientId,
    router: {},
    eas: {
      projectId: '2a1b1e36-7d9c-4916-aea8-eeae6ff6cfe5',
    },
  },
  android: {
    versionCode: 4,
    softwareKeyboardLayoutMode: 'resize',
    package: 'com.checkinhousing.locksetup',
    adaptiveIcon: {
      backgroundColor: '#0E143A',
      foregroundImage: './assets/images/android-icon-foreground.png',
    },
    permissions: [
      'android.permission.BLUETOOTH',
      'android.permission.BLUETOOTH_ADMIN',
      'android.permission.BLUETOOTH_CONNECT',
      'android.permission.BLUETOOTH_SCAN',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',
    ],
  },
  plugins: [
    'expo-router',
    ...(useDevClient ? (['expo-dev-client'] as const) : []),
    'expo-localization',
    'expo-secure-store',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        resizeMode: 'contain',
        backgroundColor: '#0E143A',
      },
    ],
    [
      'expo-build-properties',
      {
        android: {
          usesCleartextTraffic: true,
          minSdkVersion: 24,
        },
      },
    ],
  ],
});
