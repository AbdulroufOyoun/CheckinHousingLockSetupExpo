import Constants from 'expo-constants';

function trimTrailingSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

export function getApiBase(): string {
  const fromExtra = Constants.expoConfig?.extra?.apiBase as string | undefined;
  const base = fromExtra ?? process.env.EXPO_PUBLIC_API_BASE ?? 'http://10.0.2.2:8000';
  return trimTrailingSlash(base);
}

export function getTtlockClientId(): string {
  const fromExtra = Constants.expoConfig?.extra?.ttlockClientId as string | undefined;
  return fromExtra ?? process.env.EXPO_PUBLIC_TTLOCK_CLIENT_ID ?? '';
}
