import {
  LockControlType,
  ScanLockModal,
  Ttlock,
} from 'react-native-ttlock';

import { ensureBleReady, isBleRetryableError } from '@/src/ble/bleReady';

export type ScannedLock = ScanLockModal & { key: string };

const seen = new Set<string>();

const RESCAN_TIMEOUT_MS = 18_000;
const UNLOCK_RETRY_DELAY_MS = 400;
const PASSCODE_BLE_TIMEOUT_MS = 35_000;

export function startScan(onDevice: (device: ScannedLock) => void): void {
  Ttlock.startScan((scanLockModal: ScanLockModal) => {
    const key = scanLockModal.lockMac;
    if (seen.has(key)) return;
    seen.add(key);
    onDevice({ ...scanLockModal, key });
  });
}

export function stopScan(): void {
  seen.clear();
  Ttlock.stopScan();
}

/** Keeps BLE scan running until the lock is seen again (refreshes native device cache). */
export function waitForLockAdvertisement(lockMac: string, timeoutMs = RESCAN_TIMEOUT_MS): Promise<void> {
  const mac = lockMac.toLowerCase();
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };

    const timer = setTimeout(() => {
      finish(() => reject(new Error('BLE_RESCAN_TIMEOUT')));
    }, timeoutMs);

    Ttlock.startScan((scanLockModal: ScanLockModal) => {
      if (scanLockModal.lockMac?.toLowerCase() === mac) {
        finish(() => resolve());
      }
    });
  });
}

async function prepareNearLock(lockMac?: string): Promise<void> {
  stopScan();
  seen.clear();

  if (lockMac?.trim()) {
    try {
      await waitForLockAdvertisement(lockMac.trim());
    } catch {
      // Native stack may still connect from cache.
    }
  } else {
    startScan(() => {});
    await new Promise((r) => setTimeout(r, 1200));
  }

  // Official SDK expects scan stopped before control APIs.
  stopScan();
  seen.clear();
}

function initLockOnce(device: ScanLockModal): Promise<string> {
  return new Promise((resolve, reject) => {
    Ttlock.initLock(
      { lockMac: device.lockMac, lockVersion: device.lockVersion },
      (lockData: string) => {
        Ttlock.stopScan();
        seen.clear();
        resolve(lockData);
      },
      (errorCode: number, description: string) => {
        reject(new Error(description || `Init failed (${errorCode})`));
      },
    );
  });
}

export function initLockFromScan(device: ScanLockModal): Promise<string> {
  return (async () => {
    await ensureBleReady();
    if (!isSettingMode(device)) {
      throw new Error('LOCK_NOT_IN_SETTING_MODE');
    }

    try {
      await waitForLockAdvertisement(device.lockMac);
    } catch {
      // Still attempt init if the lock was listed from a recent scan.
    }

    try {
      return await initLockOnce(device);
    } catch (first) {
      const msg = first instanceof Error ? first.message : String(first);
      if (!isBleRetryableError(msg)) {
        throw first;
      }
      await waitForLockAdvertisement(device.lockMac);
      return initLockOnce(device);
    }
  })();
}

function controlUnlockOnce(lockData: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    Ttlock.controlLock(
      LockControlType.Unlock,
      lockData,
      () => resolve(),
      (errorCode: number, description: string) => {
        reject(new Error(description || `Unlock failed (${errorCode})`));
      },
    );
  });
}

/**
 * Unlock over BLE. Retries once after rescan on flaky Android connect failures
 * so users do not need to tap Unlock multiple times.
 */
export async function controlUnlock(lockData: string, lockMac?: string): Promise<void> {
  await ensureBleReady();

  try {
    await prepareNearLock(lockMac);
    try {
      await controlUnlockOnce(lockData);
      return;
    } catch (first) {
      const msg = first instanceof Error ? first.message : String(first);
      if (!isBleRetryableError(msg) || !lockMac?.trim()) {
        throw first;
      }
      if (__DEV__) {
        console.log('[unlock] BLE retry after', msg);
      }
      await new Promise((r) => setTimeout(r, UNLOCK_RETRY_DELAY_MS));
      await ensureBleReady();
      await prepareNearLock(lockMac.trim());
      await controlUnlockOnce(lockData);
    }
  } finally {
    stopScan();
    seen.clear();
  }
}

export function isSettingMode(device: ScanLockModal): boolean {
  return !device.isInited;
}

function createCustomPasscodeOnce(
  passcode: string,
  startDateMs: number,
  endDateMs: number,
  lockData: string,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };

    const timer = setTimeout(() => {
      finish(() => reject(new Error('BLE_PASSCODE_TIMEOUT')));
    }, PASSCODE_BLE_TIMEOUT_MS);

    Ttlock.createCustomPasscode(
      passcode,
      startDateMs,
      endDateMs,
      lockData,
      () => finish(() => resolve()),
      (errorCode: number, description: string) => {
        finish(() =>
          reject(new Error(description || `Create passcode failed (${errorCode})`)),
        );
      },
    );
  });
}

/**
 * Reset keyboard passcode key data on the lock (BLE). Returns new lockData to upload
 * via /v3/lock/updateLockData so remote keyboardPwd/get works (fixes TTLock -1007).
 */
export async function resetPasscodeData(
  lockData: string,
  lockMac?: string,
): Promise<string> {
  await ensureBleReady();

  const runOnce = (): Promise<string> =>
    new Promise<string>((resolve, reject) => {
      let settled = false;
      const finish = (fn: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        fn();
      };
      const timer = setTimeout(() => {
        finish(() => reject(new Error('BLE_PASSCODE_TIMEOUT')));
      }, PASSCODE_BLE_TIMEOUT_MS);

      Ttlock.resetPasscode(
        lockData,
        (lockDataNew: string) => finish(() => resolve(lockDataNew)),
        (errorCode: number, description: string) => {
          finish(() =>
            reject(new Error(description || `Reset passcode failed (${errorCode})`)),
          );
        },
      );
    });

  try {
    await prepareNearLock(lockMac);
    try {
      return await runOnce();
    } catch (first) {
      const msg = first instanceof Error ? first.message : String(first);
      if (!isBleRetryableError(msg) || !lockMac?.trim()) {
        throw first;
      }
      await ensureBleReady();
      await prepareNearLock(lockMac.trim());
      return await runOnce();
    }
  } finally {
    stopScan();
    seen.clear();
  }
}

/**
 * Write a custom timed passcode to the lock over BLE.
 * `lockData` must already be decrypted plaintext (never ldw1/lds1).
 */
export async function createCustomPasscode(
  passcode: string,
  startDateMs: number,
  endDateMs: number,
  lockData: string,
  lockMac?: string,
): Promise<void> {
  await ensureBleReady();

  try {
    await prepareNearLock(lockMac);
    try {
      await createCustomPasscodeOnce(passcode, startDateMs, endDateMs, lockData);
      return;
    } catch (first) {
      const msg = first instanceof Error ? first.message : String(first);
      if (!isBleRetryableError(msg) || !lockMac?.trim()) {
        throw first;
      }
    }

    await ensureBleReady();
    await prepareNearLock(lockMac!.trim());
    await createCustomPasscodeOnce(passcode, startDateMs, endDateMs, lockData);
  } finally {
    stopScan();
    seen.clear();
  }
}
