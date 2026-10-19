import {
  fetchTtlockToken,
  linkLock,
  syncTtlock,
} from '@/src/api/lockSetupClient';
import {
  findLockDbIdAfterSync,
  initializeCloudLock,
} from '@/src/api/ttlockCloud';
import type { PropertyType } from '@/src/types/models';

export async function provisionAndLink(
  propertyType: PropertyType,
  propertyId: number,
  lockAlias: string,
  lockData: string,
): Promise<void> {
  const { access_token } = await fetchTtlockToken();
  await initializeCloudLock(access_token, lockData, lockAlias);
  const syncData = await syncTtlock();
  const lockDbId = findLockDbIdAfterSync(
    syncData as { locks?: Array<{ id: number; lockAlias?: string }> },
    lockAlias,
  );
  if (lockDbId <= 0) {
    throw new Error(`Lock synced but not found by alias: ${lockAlias}`);
  }
  await linkLock(propertyType, propertyId, lockDbId);
}

export async function syncCloudOnly(lockAlias: string, lockData: string): Promise<void> {
  const { access_token } = await fetchTtlockToken();
  await initializeCloudLock(access_token, lockData, lockAlias);
  await syncTtlock();
}
