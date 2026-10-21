import { ensureBlePermissions } from '@/src/ble/permissions';
import { controlUnlock } from '@/src/ble/ttlockBridge';
import type { CloudLock } from '@/src/types/models';

export async function unlockWithLock(apiLock: CloudLock | undefined): Promise<void> {
  if (!apiLock) {
    throw new Error('No lock linked');
  }
  const lockData = apiLock.lockData?.trim();
  if (!lockData) {
    throw new Error('Missing lockData — sync bootstrap or re-provision the lock');
  }
  await ensureBlePermissions();
  await controlUnlock(lockData);
}

export function canAttemptUnlock(apiLock: CloudLock | undefined): boolean {
  return Boolean(apiLock?.lockData?.trim());
}
