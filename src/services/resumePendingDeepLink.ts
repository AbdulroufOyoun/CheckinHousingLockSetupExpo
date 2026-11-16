import { router, type Href } from 'expo-router';

import { consumePendingDeepLink } from '@/src/services/pendingDeepLink';

/**
 * If a deep-link path was stored (e.g. before login), navigate there.
 * Returns true when a pending path was consumed.
 */
export async function resumePendingDeepLink(
  fallbackHref: Href = '/(setup)/(tabs)/property',
): Promise<boolean> {
  const pending = await consumePendingDeepLink();
  if (pending) {
    router.replace(pending as Href);
    return true;
  }
  router.replace(fallbackHref);
  return false;
}
