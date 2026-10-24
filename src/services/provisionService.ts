import { linkLock, registerLock } from '@/src/api/lockSetupClient';
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

/** Register in tenant DB only (BLE lockData). No TTLock cloud initialize. */
export function buildRegisterPayload(
  lockAlias: string,
  lockData: string,
  device: Pick<ScannedLock, 'lockMac' | 'lockName' | 'electricQuantity'>,
  lockName?: string,
): RegisterLockPayload {
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
  await registerLock({ ...payload, vendor: 'ttlock' });
}

export type RegisterSaltoPayload = {
  vendor: 'salto';
  lock_alias: string;
  lock_name?: string;
  salto_installation_id: string;
  salto_door_id: string;
  salto_unit_id?: string;
  salto_device_id?: string;
  lock_mac?: string;
};

export async function registerSaltoDoor(payload: RegisterSaltoPayload): Promise<void> {
  await registerLock(payload);
}
