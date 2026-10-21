import { linkLock, registerLock } from '@/src/api/lockSetupClient';
import type { PropertyType } from '@/src/types/models';
import type { ScannedLock } from '@/src/ble/ttlockBridge';

function registerPayload(
  lockAlias: string,
  lockData: string,
  device: Pick<ScannedLock, 'lockMac' | 'lockName' | 'electricQuantity'>,
  lockName?: string,
) {
  const hex = device.lockMac.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
  return {
    lock_data: lockData,
    lock_mac: device.lockMac,
    lock_alias: lockAlias,
    lock_id: `local:${hex}`,
    lock_name: lockName ?? device.lockName ?? lockAlias,
    electric_quantity: device.electricQuantity,
  };
}

export async function provisionAndLink(
  propertyType: PropertyType,
  propertyId: number,
  lockAlias: string,
  lockData: string,
  device: Pick<ScannedLock, 'lockMac' | 'lockName' | 'electricQuantity'>,
  lockName?: string,
): Promise<void> {
  const created = await registerLock(registerPayload(lockAlias, lockData, device, lockName));
  const lockDbId = created.id;
  if (!lockDbId || lockDbId <= 0) {
    throw new Error('Lock registered but no database id returned');
  }
  await linkLock(propertyType, propertyId, lockDbId);
}

export async function registerLocalOnly(
  lockAlias: string,
  lockData: string,
  device: Pick<ScannedLock, 'lockMac' | 'lockName' | 'electricQuantity'>,
  lockName?: string,
): Promise<void> {
  await registerLock(registerPayload(lockAlias, lockData, device, lockName));
}
