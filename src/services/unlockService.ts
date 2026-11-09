import { Alert, Clipboard } from 'react-native';

import { fetchLockDetail } from '@/src/api/lockSetupClient';
import { ensureBlePermissions } from '@/src/ble/permissions';
import { controlUnlock } from '@/src/ble/ttlockBridge';
import { resolveApiLockData } from '@/src/crypto/lockDataWire';
import i18n from '@/src/i18n';
import type { CloudLock } from '@/src/types/models';
import { cloudLockFromApiLock } from '@/src/utils/apiLockFromRecord';

import {
  buildUnlockDiagnostic,
  UnlockError,
} from '@/src/services/unlockDiagnostics';

const WIRE_PREFIX = 'ldw1:';
const STORAGE_PREFIX = 'lds1:';

export class UnlockCancelledError extends Error {
  constructor() {
    super('UNLOCK_CANCELLED');
    this.name = 'UnlockCancelledError';
  }
}

/** Show decrypted lockData; user may copy, then must confirm before BLE unlock. */
async function confirmDecryptedLockData(lockData: string): Promise<void> {
  const t = i18n.t.bind(i18n);

  // Loop so Copy can re-show the same confirm dialog afterward.
  for (;;) {
    const action = await new Promise<'copy' | 'unlock' | 'cancel'>((resolve) => {
      Alert.alert(
        t('unlockConfirmTitle'),
        `${t('unlockConfirmHint')}\n\n${lockData}`,
        [
          {
            text: t('cancel'),
            style: 'cancel',
            onPress: () => resolve('cancel'),
          },
          {
            text: t('copyLockData'),
            onPress: () => resolve('copy'),
          },
          {
            text: t('unlock'),
            onPress: () => resolve('unlock'),
          },
        ],
        { cancelable: true, onDismiss: () => resolve('cancel') },
      );
    });

    if (action === 'cancel') {
      throw new UnlockCancelledError();
    }
    if (action === 'unlock') {
      return;
    }

    Clipboard.setString(lockData);
    await new Promise<void>((resolve) => {
      Alert.alert(t('done'), t('lockDataCopied'), [
        { text: t('done'), onPress: () => resolve() },
      ]);
    });
  }
}

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

  // Debug-only: show/copy plaintext before BLE unlock. Production unlocks immediately.
  if (__DEV__) {
    await confirmDecryptedLockData(lockData);
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
