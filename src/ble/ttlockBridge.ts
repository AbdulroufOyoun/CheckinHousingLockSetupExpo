import {
  LockControlType,
  ScanLockModal,
  Ttlock,
} from 'react-native-ttlock';

import { ensureBlePermissions } from '@/src/ble/permissions';

export type ScannedLock = ScanLockModal & { key: string };

const seen = new Set<string>();

const RESCAN_TIMEOUT_MS = 18_000;

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
    const permitted = await ensureBlePermissions();
    if (!permitted) {
      throw new Error('BLE_PERMISSIONS');
    }
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
      const retry =
        msg.toLowerCase().includes('connect timeout') ||
        msg.toLowerCase().includes('disconnected') ||
        msg.toLowerCase().includes('connect fail');
      if (!retry) {
        throw first;
      }
      await waitForLockAdvertisement(device.lockMac);
      return initLockOnce(device);
    }
  })();
}

export function controlUnlock(lockData: string): Promise<void> {
  return new Promise((resolve, reject) => {
    Ttlock.controlLock(
      LockControlType.Unlock,
      lockData,
      () => {
        resolve();
      },
      (errorCode: number, description: string) => {
        reject(new Error(description || `Unlock failed (${errorCode})`));
      },
    );
  });
}

export function isSettingMode(device: ScanLockModal): boolean {
  return !device.isInited;
}
