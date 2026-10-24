import { ensureBlePermissions } from '@/src/ble/permissions';
import { controlUnlock } from '@/src/ble/ttlockBridge';
import { fetchSaltoSetupKey } from '@/src/api/lockSetupClient';
import type { CloudLock } from '@/src/types/models';
import { saltoUnlock } from 'react-native-salto-justin';

export async function unlockWithLock(apiLock: CloudLock | undefined): Promise<void> {
  if (!apiLock) {
    throw new Error('No lock linked');
  }

  await ensureBlePermissions();

  if (apiLock.vendor === 'salto') {
    let hex = apiLock.digitalKey?.trim();
    if (!hex && apiLock.dbId) {
      const issued = await fetchSaltoSetupKey(apiLock.dbId);
      hex = issued.digitalKey?.trim();
    }
    if (!hex) {
      throw new Error('Missing Salto digital key');
    }
    await saltoUnlock(hex);
    return;
  }

  const lockData = apiLock.lockData?.trim();
  if (!lockData) {
    throw new Error('Missing lockData — sync bootstrap or re-provision the lock');
  }
  await controlUnlock(lockData);
}

export function canAttemptUnlock(apiLock: CloudLock | undefined): boolean {
  if (!apiLock) {
    return false;
  }
  if (apiLock.vendor === 'salto') {
    return Boolean(apiLock.dbId);
  }
  return Boolean(apiLock.lockData?.trim());
}
