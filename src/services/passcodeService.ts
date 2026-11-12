import { createCustomPasscode, resetPasscodeData } from '@/src/ble/ttlockBridge';
import { resolveApiLockData } from '@/src/crypto/lockDataWire';
import {
  ApiError,
  createCloudPasscode,
  fetchLockDetail,
  recordBlePasscode,
  syncPasscodeLockData,
} from '@/src/api/lockSetupClient';
import type { LockPasscodeRecord } from '@/src/types/models';

const WIRE_PREFIX = 'ldw1:';
const STORAGE_PREFIX = 'lds1:';

export function generateRandomPasscode(length = 6): string {
  const len = Math.min(9, Math.max(4, length));
  let out = '';
  for (let i = 0; i < len; i += 1) {
    const min = i === 0 ? 1 : 0;
    out += String(Math.floor(Math.random() * (10 - min)) + min);
  }
  return out;
}

function decryptLockDataForSdk(api: {
  id?: number;
  lockData?: string | null;
}): string {
  const lockData = resolveApiLockData({
    id: api.id,
    lockData: api.lockData,
  }).trim();

  if (!lockData) {
    throw new Error('Missing lockData — open lock details or re-sync the lock');
  }
  if (lockData.startsWith(WIRE_PREFIX)) {
    throw new Error('Could not decrypt lockData (wire key mismatch?)');
  }
  if (lockData.startsWith(STORAGE_PREFIX)) {
    throw new Error('Invalid lockData from API (storage blob leaked)');
  }

  return lockData;
}

function errorText(e: unknown): string {
  if (e instanceof ApiError) {
    try {
      const j = JSON.parse(e.raw || '') as { message?: string };
      return `${e.message} ${j.message ?? ''}`;
    } catch {
      return e.message;
    }
  }
  if (e instanceof Error) return e.message;
  return String(e ?? '');
}

function isPasscodeDataMissingError(e: unknown): boolean {
  const m = errorText(e).toLowerCase();
  return (
    m.includes('passcode_data_missing') ||
    m.includes('no password data') ||
    m.includes('no ttlock cloud password data') ||
    m.includes('-1007')
  );
}

function isCloudUnavailableError(e: unknown): boolean {
  const m = errorText(e).toLowerCase();
  return (
    m.includes('not on ttlock cloud') ||
    m.includes('no ttlock cloud lockid') ||
    m.includes('local provisioning only') ||
    m.includes('local:') ||
    (m.includes('cloud is disabled') && m.includes('ttlock'))
  );
}

async function createViaBle(params: {
  lockDbId: number;
  roomId?: number;
  bookingId?: number;
  assignedUserId?: number | null;
  startDate: number;
  endDate: number;
  keyboardPwdType: 2 | 3;
  name?: string;
}): Promise<LockPasscodeRecord> {
  const lock = await fetchLockDetail(params.lockDbId);
  const plainLockData = decryptLockDataForSdk(lock);
  const isPermanent = params.keyboardPwdType === 2 || params.endDate === 0;
  const keyboardPwd = generateRandomPasscode(6);
  const bleEndDate = isPermanent ? 0 : params.endDate;

  if (__DEV__) {
    console.log('[passcode] BLE fallback write', {
      lockDbId: params.lockDbId,
      lockMac: lock.lockMac,
    });
  }

  await createCustomPasscode(
    keyboardPwd,
    params.startDate,
    bleEndDate,
    plainLockData,
    lock.lockMac,
  );

  return recordBlePasscode({
    lock_id: params.lockDbId,
    room_id: params.roomId,
    booking_id: params.bookingId,
    assigned_user_id: params.assignedUserId ?? null,
    keyboard_pwd: keyboardPwd,
    start_date: params.startDate,
    end_date: isPermanent ? 0 : params.endDate,
    keyboard_pwd_name: params.name,
    keyboard_pwd_type: isPermanent ? 2 : params.keyboardPwdType,
    sync_to_cloud: false,
  });
}

/**
 * One-time BLE resetPasscode + cloud updateLockData so remote keyboardPwd/get works.
 */
async function repairCloudPasscodeData(lockDbId: number): Promise<void> {
  const lock = await fetchLockDetail(lockDbId);
  const plain = decryptLockDataForSdk(lock);
  if (__DEV__) {
    console.log('[passcode] repairing cloud password data via BLE resetPasscode', {
      lockDbId,
      lockMac: lock.lockMac,
    });
  }
  const fresh = await resetPasscodeData(plain, lock.lockMac);
  await syncPasscodeLockData(lockDbId, fresh);
}

type CloudCreateBody = {
  lock_id: number;
  room_id?: number;
  booking_id?: number;
  assigned_user_id?: number | null;
  start_date: number;
  end_date: number;
  keyboard_pwd_name?: string;
  keyboard_pwd_type: 2 | 3;
  mode: 'cloud_get';
};

/**
 * Prefer TTLock cloud (no Bluetooth). If cloud password data is missing (-1007),
 * repair once via BLE resetPasscode then retry cloud. Only fall back to BLE custom
 * write when the lock is not on cloud at all.
 */
export async function createRandomTimedPasscode(params: {
  lockDbId: number;
  roomId?: number;
  bookingId?: number;
  assignedUserId?: number | null;
  startDate?: number;
  endDate?: number;
  durationMs?: number;
  keyboardPwdType?: 2 | 3;
  name?: string;
}): Promise<LockPasscodeRecord> {
  const now = Date.now();
  const keyboardPwdType = params.keyboardPwdType ?? 3;
  const startDate = params.startDate ?? now + 60_000;
  const endDate =
    params.endDate !== undefined
      ? params.endDate
      : params.durationMs != null
        ? startDate + params.durationMs
        : startDate + 24 * 60 * 60 * 1000;

  const isPermanent = keyboardPwdType === 2 || endDate === 0;
  if (!isPermanent && endDate <= startDate) {
    throw new Error('Passcode end time must be after start time');
  }

  const effectiveStart = isPermanent ? Math.max(startDate, now + 60_000) : startDate;

  const blePayload = {
    lockDbId: params.lockDbId,
    roomId: params.roomId,
    bookingId: params.bookingId,
    assignedUserId: params.assignedUserId ?? null,
    startDate: effectiveStart,
    endDate: isPermanent ? 0 : endDate,
    keyboardPwdType: (isPermanent ? 2 : keyboardPwdType) as 2 | 3,
    name: params.name,
  };

  const cloudBody: CloudCreateBody = {
    lock_id: blePayload.lockDbId,
    room_id: blePayload.roomId,
    booking_id: blePayload.bookingId,
    assigned_user_id: blePayload.assignedUserId,
    start_date: blePayload.startDate,
    end_date: blePayload.endDate,
    keyboard_pwd_name: blePayload.name,
    keyboard_pwd_type: blePayload.keyboardPwdType,
    mode: 'cloud_get',
  };

  try {
    return await createCloudPasscode(cloudBody);
  } catch (e) {
    if (isPasscodeDataMissingError(e)) {
      try {
        await repairCloudPasscodeData(params.lockDbId);
        return await createCloudPasscode(cloudBody);
      } catch (repairErr) {
        // Still far from lock / BLE failed — do not pretend this is a generic connect error.
        const bleMsg = errorText(repairErr).toLowerCase();
        if (
          bleMsg.includes('ble_passcode_timeout') ||
          bleMsg.includes('connect') ||
          bleMsg.includes('bluetooth') ||
          bleMsg.includes('ble_permissions')
        ) {
          throw new Error('PASSCODE_NEEDS_NEAR_LOCK_ONCE');
        }
        throw repairErr;
      }
    }

    if (!isCloudUnavailableError(e)) {
      throw e;
    }
    if (__DEV__) {
      console.log('[passcode] cloud unavailable — BLE custom fallback');
    }
    return createViaBle(blePayload);
  }
}
