import { ensureBlePermissions } from '@/src/ble/permissions';
import { controlUnlock } from '@/src/ble/ttlockBridge';
import { resolveApiLockData } from '@/src/crypto/lockDataWire';
import type { CloudLock } from '@/src/types/models';

import {
  buildUnlockDiagnostic,
  UnlockError,
} from '@/src/services/unlockDiagnostics';

const WIRE_PREFIX = 'ldw1:';
const STORAGE_PREFIX = 'lds1:';

export async function unlockWithLock(apiLock: CloudLock | undefined): Promise<void> {
  if (!apiLock) {
    throw new Error('No lock linked');
  }

  await ensureBlePermissions();

  const raw = (apiLock.lockData ?? '').trim();
  let lockData: string;

  try {
    lockData = resolveApiLockData({
      id: apiLock.dbId,
      dbId: apiLock.dbId,
      lockData: apiLock.lockData,
    }).trim();
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const diagnostic = buildUnlockDiagnostic(apiLock, raw, '', 'decrypt', {
      nativeMessage: message,
    });
    throw new UnlockError(message, diagnostic);
  }

  if (!lockData) {
    const diagnostic = buildUnlockDiagnostic(apiLock, raw, '', 'precheck');
    throw new UnlockError('Missing lockData — sync bootstrap or re-provision the lock', diagnostic);
  }

  if (lockData.startsWith(WIRE_PREFIX)) {
    const diagnostic = buildUnlockDiagnostic(apiLock, raw, lockData, 'decrypt');
    throw new UnlockError(
      apiLock.dbId
        ? 'Lock data is still encrypted (ldw1) after decrypt step'
        : 'Missing lock db id for encrypted lockData',
      diagnostic,
    );
  }

  if (lockData.startsWith(STORAGE_PREFIX)) {
    const diagnostic = buildUnlockDiagnostic(apiLock, raw, lockData, 'precheck');
    throw new UnlockError('Invalid lockData from API (lds1 storage blob)', diagnostic);
  }

  if (lockData.length < 80 || lockData.length > 4000) {
    const diagnostic = buildUnlockDiagnostic(apiLock, raw, lockData, 'precheck');
    throw new UnlockError(`lockData length ${lockData.length} looks invalid`, diagnostic);
  }

  const diagnostic = buildUnlockDiagnostic(apiLock, raw, lockData, 'ttlock');

  try {
    await controlUnlock(lockData, apiLock.lockMac);
  } catch (e) {
    const nativeMessage = e instanceof Error ? e.message : String(e);
    throw new UnlockError(nativeMessage, { ...diagnostic, nativeMessage });
  }
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
