import {
  LockControlType,
  ScanLockModal,
  Ttlock,
} from 'react-native-ttlock';

export type ScannedLock = ScanLockModal & { key: string };

const seen = new Set<string>();

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

export function initLockFromScan(device: ScanLockModal): Promise<string> {
  return new Promise((resolve, reject) => {
    Ttlock.initLock(
      { lockMac: device.lockMac, lockVersion: device.lockVersion },
      (lockData: string) => {
        Ttlock.stopScan();
        resolve(lockData);
      },
      (errorCode: number, description: string) => {
        reject(new Error(description || `Init failed (${errorCode})`));
      },
    );
  });
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
