import * as SecureStore from 'expo-secure-store';

const KEY = 'pending_deep_link';

/** Store an in-app path to resume after login / tenant selection (e.g. /(setup)/unlock/201). */
export async function setPendingDeepLink(path: string): Promise<void> {
  const trimmed = path.trim();
  if (!trimmed) {
    await SecureStore.deleteItemAsync(KEY);
    return;
  }
  await SecureStore.setItemAsync(KEY, trimmed);
}

export async function peekPendingDeepLink(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY);
}

/** Read and clear the pending path in one step. */
export async function consumePendingDeepLink(): Promise<string | null> {
  const path = await SecureStore.getItemAsync(KEY);
  if (path) {
    await SecureStore.deleteItemAsync(KEY);
  }
  return path;
}

export async function clearPendingDeepLink(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY);
}
