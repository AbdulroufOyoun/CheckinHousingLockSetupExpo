import { fetchTtlockToken } from '@/src/api/lockSetupClient';
import { fetchCloudLocks } from '@/src/api/ttlockCloud';
import { controlUnlock } from '@/src/ble/ttlockBridge';
import { getTenantCache, setCloudLocks } from '@/src/services/tenantCache';
import type { CloudLock } from '@/src/types/models';
import { mergeCloudLock, resolveLockData } from '@/src/utils/lockMerge';

export async function unlockWithLock(apiLock: CloudLock | undefined): Promise<void> {
  if (!apiLock) {
    throw new Error('No lock linked');
  }
  let cloudList = getTenantCache().cloudLocks;
  let lockData = resolveLockData(apiLock, cloudList);
  if (!lockData) {
    const { access_token } = await fetchTtlockToken();
    cloudList = await fetchCloudLocks(access_token);
    setCloudLocks(cloudList);
    lockData = resolveLockData(apiLock, cloudList);
  }
  if (!lockData) {
    throw new Error('Missing lockData — sync TTLock or re-link');
  }
  const merged = mergeCloudLock(apiLock, cloudList);
  await controlUnlock(lockData);
  return;
}

export function canAttemptUnlock(apiLock: CloudLock | undefined): boolean {
  if (!apiLock) return false;
  return Boolean(
    apiLock.dbId ||
      apiLock.lockId ||
      apiLock.lockMac ||
      apiLock.lockAlias ||
      apiLock.lockData,
  );
}
