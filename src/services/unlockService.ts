import { ensureBlePermissions } from '@/src/ble/permissions';
import { controlUnlock } from '@/src/ble/ttlockBridge';
import { resolveApiLockData } from '@/src/crypto/lockDataWire';
import type { CloudLock } from '@/src/types/models';

const WIRE_PREFIX = 'ldw1:';

export async function unlockWithLock(apiLock: CloudLock | undefined): Promise<void> {
  if (!apiLock) {
    throw new Error('No lock linked');
  }

  await ensureBlePermissions();

  const lockData = resolveApiLockData({
    id: apiLock.dbId,
    dbId: apiLock.dbId,
    lockData: apiLock.lockData,
  }).trim();
  if (!lockData) {
    throw new Error('Missing lockData — sync bootstrap or re-provision the lock');
  }
  if (lockData.startsWith(WIRE_PREFIX)) {
    throw new Error(
      apiLock.dbId
        ? 'Lock data is still encrypted — add EXPO_PUBLIC_LOCK_DATA_WIRE_KEY and rebuild'
        : 'Missing lock db id for encrypted lockData',
    );
  }
  await controlUnlock(lockData, apiLock.lockMac);
}

export function canAttemptUnlock(apiLock: CloudLock | undefined): boolean {
  const raw = apiLock?.lockData?.trim() ?? '';
  if (!raw) {
    return false;
  }
  if (raw.startsWith(WIRE_PREFIX)) {
    return Boolean(apiLock?.dbId);
  }
  return true;
}
