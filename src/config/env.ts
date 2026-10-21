import Constants from 'expo-constants';

import { getApiBaseOverride } from '@/src/config/apiBaseOverride';
import {
  DEV_API_BASE,
  PRODUCTION_API_BASE,
  TTLOCK_CLIENT_ID as DEFAULT_TTLOCK_CLIENT_ID,
} from '@/src/config/projectDefaults';

function trimTrailingSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

/** Strip accidental `/api` suffix (Platform env uses .../api). */
export function normalizeApiRoot(base: string): string {
  let b = base.trim();
  if (!b) {
    return b;
  }
  if (!/^https?:\/\//i.test(b)) {
    b = `http://${b}`;
  }
  b = trimTrailingSlash(b);
  if (b.endsWith('/api')) {
    b = b.slice(0, -4);
  }
  return b;
}

/** Hosts that only work on Android emulator, not on a physical phone. */
export function isEmulatorOnlyApiHost(base: string): boolean {
  const normalized = normalizeApiRoot(base).toLowerCase();
  return (
    normalized.includes('10.0.2.2') ||
    normalized.includes('127.0.0.1') ||
    normalized.includes('localhost')
  );
}

export function isProductionAppVariant(): boolean {
  const fromExtra = Constants.expoConfig?.extra?.appVariant as string | undefined;
  return (
    fromExtra === 'production' ||
    process.env.EXPO_PUBLIC_APP_VARIANT === 'production' ||
    process.env.EAS_BUILD_PROFILE === 'production'
  );
}

export function getApiBase(): string {
  const fromOverride = getApiBaseOverride();
  if (fromOverride) {
    return normalizeApiRoot(fromOverride);
  }
  const fromPublic = process.env.EXPO_PUBLIC_API_BASE;
  if (fromPublic?.trim()) {
    return normalizeApiRoot(fromPublic);
  }
  const fromExtra = Constants.expoConfig?.extra?.apiBase as string | undefined;
  if (fromExtra?.trim()) {
    return normalizeApiRoot(fromExtra);
  }
  if (isProductionAppVariant()) {
    return PRODUCTION_API_BASE;
  }
  return DEV_API_BASE;
}

export function getTtlockClientId(): string {
  const fromExtra = Constants.expoConfig?.extra?.ttlockClientId as string | undefined;
  return fromExtra ?? process.env.EXPO_PUBLIC_TTLOCK_CLIENT_ID ?? DEFAULT_TTLOCK_CLIENT_ID;
}

/** Server URL is baked into the repo; login screen does not require editing it. */
export function isApiBasePreconfigured(): boolean {
  return Boolean(getApiBase());
}
