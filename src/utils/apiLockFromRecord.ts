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

export function firstLockData(locks: ApiLock[] | undefined): string {
  const first = locks?.[0];
  return first?.lockData?.trim() ?? '';
}
