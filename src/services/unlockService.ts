import { fetchLockDetail } from '@/src/api/lockSetupClient';
import { ensureBlePermissions } from '@/src/ble/permissions';
import { controlUnlock } from '@/src/ble/ttlockBridge';
import { resolveApiLockData } from '@/src/crypto/lockDataWire';
import { normalizeTtlockOpaqueLockData } from '@/src/crypto/ttlockOpaqueLockData';
import type { CloudLock } from '@/src/types/models';
import { cloudLockFromApiLock } from '@/src/utils/apiLockFromRecord';

import {
  buildUnlockDiagnostic,
  UnlockError,
} from '@/src/services/unlockDiagnostics';

const WIRE_PREFIX = 'ldw1:';
const STORAGE_PREFIX = 'lds1:';

async function lockWithFreshApiData(apiLock: CloudLock): Promise<CloudLock> {
  if (!apiLock.dbId || apiLock.dbId < 1) {
    return apiLock;
  }
  try {
    const detail = await fetchLockDetail(apiLock.dbId);
    const fresh = cloudLockFromApiLock(detail);
    if (fresh?.lockData?.trim()) {
      return {
        ...apiLock,
        ...fresh,
        dbId: fresh.dbId ?? apiLock.dbId,
        lockDataSha256Prefix: fresh.lockDataSha256Prefix ?? apiLock.lockDataSha256Prefix,
      };
    }
  } catch {
    /* fall back to cached bootstrap/detail */
  }
  return apiLock;
}

export async function unlockWithLock(apiLock: CloudLock | undefined): Promise<void> {
  if (!apiLock) {
    throw new Error('No lock linked');
  }

  await ensureBlePermissions();

  const resolvedLock = await lockWithFreshApiData(apiLock);
  const raw = (resolvedLock.lockData ?? '').trim();
  let lockData: string;

  try {
    lockData = resolveApiLockData({
      id: resolvedLock.dbId,
      dbId: resolvedLock.dbId,
      lockData: resolvedLock.lockData,
    }).trim();
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const diagnostic = buildUnlockDiagnostic(resolvedLock, raw, '', 'decrypt', {
      nativeMessage: message,
    });
    throw new UnlockError(message, diagnostic);
  }

  if (!lockData) {
    const diagnostic = buildUnlockDiagnostic(resolvedLock, raw, '', 'precheck');
    throw new UnlockError('Missing lockData — sync bootstrap or re-provision the lock', diagnostic);
  }

  if (lockData.startsWith(WIRE_PREFIX)) {
    const diagnostic = buildUnlockDiagnostic(resolvedLock, raw, lockData, 'decrypt');
    throw new UnlockError(
      resolvedLock.dbId
        ? 'Lock data is still encrypted (ldw1) after decrypt step'
        : 'Missing lock db id for encrypted lockData',
      diagnostic,
    );
  }

  if (lockData.startsWith(STORAGE_PREFIX)) {
    const diagnostic = buildUnlockDiagnostic(resolvedLock, raw, lockData, 'precheck');
    throw new UnlockError('Invalid lockData from API (lds1 storage blob)', diagnostic);
  }

  if (lockData.length < 80 || lockData.length > 4000) {
    const diagnostic = buildUnlockDiagnostic(resolvedLock, raw, lockData, 'precheck');
    throw new UnlockError(`lockData length ${lockData.length} looks invalid`, diagnostic);
  }

  try {
    lockData = await normalizeTtlockOpaqueLockData(lockData);
  } catch {
    /* keep decrypted wire plaintext */
  }

  const diagnostic = buildUnlockDiagnostic(resolvedLock, raw, lockData, 'ttlock');

  try {
    await controlUnlock(lockData, resolvedLock.lockMac);
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
