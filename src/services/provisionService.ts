import { fetchTtlockToken, linkLock, registerLock } from '@/src/api/lockSetupClient';
import { resolveCloudLockId } from '@/src/api/ttlockCloud';
import type { PropertyType } from '@/src/types/models';
import type { ScannedLock } from '@/src/ble/ttlockBridge';

export type RegisterLockPayload = {
  lock_data: string;
  lock_mac: string;
  lock_alias: string;
  lock_id: string;
  lock_name: string;
  electric_quantity: number;
};

export async function buildRegisterPayload(
  lockAlias: string,
  lockData: string,
  device: Pick<ScannedLock, 'lockMac' | 'lockName' | 'electricQuantity'>,
  lockName?: string,
): Promise<RegisterLockPayload> {
  const { access_token } = await fetchTtlockToken();
  const cloudLockId = await resolveCloudLockId(
    lockData,
    lockAlias,
    device.lockMac,
    access_token,
  );

  return {
    lock_data: lockData,
    lock_mac: device.lockMac,
    lock_alias: lockAlias,
    lock_id: cloudLockId,
    lock_name: lockName ?? device.lockName ?? lockAlias,
    electric_quantity: device.electricQuantity,
  };
}

export async function provisionAndLink(
  propertyType: PropertyType,
  propertyId: number,
  payload: RegisterLockPayload,
): Promise<void> {
  const created = await registerLock(payload);
  const lockDbId = created.id;
  if (!lockDbId || lockDbId <= 0) {
    throw new Error('Lock registered but no database id returned');
  }
  await linkLock(propertyType, propertyId, lockDbId);
}

export async function registerLocalOnly(payload: RegisterLockPayload): Promise<void> {
  await registerLock(payload);
}
