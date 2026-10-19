import type { ExpoConfig, ConfigContext } from 'expo/config';

const apiBase = process.env.EXPO_PUBLIC_API_BASE ?? 'http://10.0.2.2:8000/';
const ttlockClientId =
  process.env.EXPO_PUBLIC_TTLOCK_CLIENT_ID ?? '6515a7be0115469f90ad7b1bddbc4b5b';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Checkin Lock Setup',
  slug: 'checkinhousing-lock-setup',
  version: '1.0.0',
  orientation: 'portrait',
  scheme: 'checkin-lock-setup',
  userInterfaceStyle: 'dark',
  icon: './assets/images/icon.png',
  experiments: { typedRoutes: true },
  extra: {
    apiBase,
    ttlockClientId,
    router: {},
    eas: {
      projectId: '2a1b1e36-7d9c-4916-aea8-eeae6ff6cfe5',
    },
  },
  android: {
    package: 'com.checkinhousing.locksetup',
    adaptiveIcon: {
      backgroundColor: '#0F1419',
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
    'expo-dev-client',
    'expo-localization',
    'expo-secure-store',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        resizeMode: 'contain',
        backgroundColor: '#0F1419',
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
