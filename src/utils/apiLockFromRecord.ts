import { resolveApiLockData } from '@/src/crypto/lockDataWire';
import type { ApiLock, CloudLock, LockDetailRecord } from '@/src/types/models';

type LockRecord = ApiLock | LockDetailRecord;

/** BLE unlock uses lockData from tenant DB — TTLock cloud is not required. */
export function cloudLockFromApiLock(api: LockRecord | undefined | null): CloudLock | undefined {
  if (!api?.id) {
    return undefined;
  }
  return {
    dbId: api.id,
    vendor: 'ttlock',
    lockId: api.lockId,
    lockName: api.lockName,
    lockMac: api.lockMac,
    lockAlias: api.lockAlias,
    lockData: resolveApiLockData(api),
  };
}

/** Prefer fresh API lock; always decrypt with known db id before unlock. */
export function cloudLockForUnlock(
  primary: LockRecord | undefined | null,
  fallback: CloudLock | undefined,
  lockDbId?: number,
): CloudLock | undefined {
  const fromApi = cloudLockFromApiLock(primary);
  if (fromApi) {
    return fromApi;
  }
  if (!fallback) {
    return undefined;
  }
  const dbId = fallback.dbId ?? lockDbId;
  if (!dbId) {
    return fallback;
  }
  return {
    ...fallback,
    dbId,
    lockData: resolveApiLockData({ id: dbId, lockData: fallback.lockData }),
  };
}

export function firstLockData(locks: ApiLock[] | undefined): string {
  const first = locks?.[0];
  return first?.lockData?.trim() ?? '';
}
