import { ensureBlePermissions } from '@/src/ble/permissions';
import { controlUnlock } from '@/src/ble/ttlockBridge';
import type { CloudLock } from '@/src/types/models';
import { mergeCloudLock, resolveLockData } from '@/src/utils/lockMerge';

export async function unlockWithLock(apiLock: CloudLock | undefined): Promise<void> {
  if (!apiLock) {
    throw new Error('No lock linked');
  }
  let lockData = resolveLockData(apiLock, []);
  if (!lockData && apiLock.lockData) {
    lockData = apiLock.lockData;
  }
  if (!lockData) {
    throw new Error('Missing lockData — re-provision the lock or sync from server');
  }
  mergeCloudLock({ ...apiLock, lockData }, []);
  await ensureBlePermissions();
  await controlUnlock(lockData);
}

export function canAttemptUnlock(apiLock: CloudLock | undefined): boolean {
  if (!apiLock) return false;
  return Boolean(
    apiLock.lockData ||
      apiLock.dbId ||
      apiLock.lockId ||
      apiLock.lockMac ||
      apiLock.lockAlias,
  );
}
