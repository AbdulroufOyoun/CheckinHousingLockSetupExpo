import {
  LockControlType,
  ScanLockModal,
  Ttlock,
} from 'react-native-ttlock';

import { ensureBleReady, isBleRetryableError } from '@/src/ble/bleReady';

export type ScannedLock = ScanLockModal & { key: string };

const seen = new Set<string>();

/** How long one scan waits for the lock to advertise before giving up. */
const SIGHT_TIMEOUT_MS = 8_000;
/** Provisioning keeps the longer window: the lock is in setting mode and must be seen. */
const RESCAN_TIMEOUT_MS = 18_000;
/** A sighting this recent means Android still has the lock in its LE cache — no rescan needed. */
const SIGHT_FRESH_MS = 6_000;
/** Android needs a moment between stopScan and connectGatt or the connect stalls. */
const SETTLE_AFTER_SCAN_MS = 300;
const NO_MAC_SCAN_MS = 1_200;
const PASSCODE_BLE_TIMEOUT_MS = 35_000;

const MAX_BLE_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [500, 1200];

/**
 * Android silently returns no scan results after 5 scan starts in 30 s.
 * Stay one below that so a scan we start is always a real scan.
 */
const SCAN_BUDGET_MAX = 4;
const SCAN_BUDGET_WINDOW_MS = 30_000;

const scanStartTimes: number[] = [];
const lastSeenAt = new Map<string, number>();

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function normMac(mac: string): string {
  return mac.trim().toLowerCase();
}

function hasScanBudget(): boolean {
  const cutoff = Date.now() - SCAN_BUDGET_WINDOW_MS;
  while (scanStartTimes.length > 0 && scanStartTimes[0] < cutoff) {
    scanStartTimes.shift();
  }
  return scanStartTimes.length < SCAN_BUDGET_MAX;
}

/** Every native scan start goes through here so the budget above stays accurate. */
function nativeStartScan(onDevice: (device: ScanLockModal) => void): void {
  scanStartTimes.push(Date.now());
  Ttlock.startScan((device: ScanLockModal) => {
    if (device?.lockMac) {
      lastSeenAt.set(normMac(device.lockMac), Date.now());
    }
    onDevice(device);
  });
}

export function startScan(onDevice: (device: ScannedLock) => void): void {
  nativeStartScan((scanLockModal: ScanLockModal) => {
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
  const mac = normMac(lockMac);
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

    nativeStartScan((scanLockModal: ScanLockModal) => {
      if (scanLockModal.lockMac && normMac(scanLockModal.lockMac) === mac) {
        finish(() => resolve());
      }
    });
  });
}

/** What happened on the radio during one BLE operation — shown in unlock diagnostics. */
export type BleOpStats = {
  attempts: number;
  /** true = lock advertised before the last attempt; false = never seen; undefined = no MAC to look for. */
  sighted?: boolean;
  scanSkipped?: 'fresh' | 'throttled' | 'no_mac';
  elapsedMs: number;
};

export class BleOpError extends Error {
  readonly stats: BleOpStats;
  readonly nativeMessage: string;

  constructor(message: string, nativeMessage: string, stats: BleOpStats) {
    super(message);
    this.name = 'BleOpError';
    this.nativeMessage = nativeMessage;
    this.stats = stats;
  }
}

type Sighting = Pick<BleOpStats, 'sighted' | 'scanSkipped'>;

/**
 * Make sure Android has just seen the lock advertise, then leave the radio idle.
 * The TTLock SDK connects by MAC with a 10 s timeout; without a recent sighting that
 * connect often stalls until the timeout ("bluetooth connect timeout").
 */
async function sightLock(lockMac?: string): Promise<Sighting> {
  stopScan();

  const mac = lockMac?.trim() ? normMac(lockMac) : '';
  if (!mac) {
    // No MAC to wait for: a short scan still warms Android's LE device cache.
    if (hasScanBudget()) {
      nativeStartScan(() => {});
      await sleep(NO_MAC_SCAN_MS);
      stopScan();
      await sleep(SETTLE_AFTER_SCAN_MS);
    }
    return { scanSkipped: 'no_mac' };
  }

  const last = lastSeenAt.get(mac);
  if (last && Date.now() - last < SIGHT_FRESH_MS) {
    await sleep(SETTLE_AFTER_SCAN_MS);
    return { sighted: true, scanSkipped: 'fresh' };
  }

  if (!hasScanBudget()) {
    // A throttled scan returns nothing; better to try the connect than to wait blind.
    return { sighted: false, scanSkipped: 'throttled' };
  }

  let sighted = false;
  try {
    await waitForLockAdvertisement(mac, SIGHT_TIMEOUT_MS);
    sighted = true;
  } catch {
    // Not seen in this window — the native stack may still connect from its cache.
  }

  // Official SDK expects scan stopped before control APIs.
  stopScan();
  await sleep(SETTLE_AFTER_SCAN_MS);
  return { sighted };
}

let bleQueue: Promise<unknown> = Promise.resolve();

/** One BLE operation at a time: a second tap waits instead of fighting over the radio. */
function runExclusive<T>(fn: () => Promise<T>): Promise<T> {
  const run = bleQueue.then(fn, fn);
  bleQueue = run.catch(() => undefined);
  return run;
}

/**
 * Sight the lock, run one TTLock command, and retry on flaky Android connect failures
 * so users do not need to tap multiple times.
 */
async function runNearLock<T>(lockMac: string | undefined, op: () => Promise<T>): Promise<T> {
  return runExclusive(async () => {
    const startedAt = Date.now();
    const stats: BleOpStats = { attempts: 0, elapsedMs: 0 };
    let everSighted = false;
    let lastNative = '';

    try {
      for (let attempt = 1; attempt <= MAX_BLE_ATTEMPTS; attempt += 1) {
        await ensureBleReady();
        const sighting = await sightLock(lockMac);
        stats.attempts = attempt;
        stats.sighted = sighting.sighted;
        stats.scanSkipped = sighting.scanSkipped;
        everSighted = everSighted || sighting.sighted === true;

        try {
          return await op();
        } catch (e) {
          lastNative = e instanceof Error ? e.message : String(e);
          if (!isBleRetryableError(lastNative) || attempt === MAX_BLE_ATTEMPTS) {
            break;
          }
          if (__DEV__) {
            console.log(`[ble] attempt ${attempt} failed, retrying:`, lastNative);
          }
          await sleep(RETRY_DELAYS_MS[attempt - 1] ?? 1200);
        }
      }
    } finally {
      stopScan();
    }

    stats.elapsedMs = Date.now() - startedAt;
    const neverSeen =
      Boolean(lockMac?.trim()) && !everSighted && isBleRetryableError(lastNative);
    throw new BleOpError(neverSeen ? 'BLE_LOCK_NOT_SEEN' : lastNative, lastNative, stats);
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
  return runExclusive(async () => {
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
  });
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

/** Unlock over BLE. Throws `BleOpError` (with radio stats) when every attempt fails. */
export function controlUnlock(lockData: string, lockMac?: string): Promise<void> {
  return runNearLock(lockMac, () => controlUnlockOnce(lockData));
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

function resetPasscodeOnce(lockData: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
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
}

/**
 * Reset keyboard passcode key data on the lock (BLE). Returns new lockData to upload
 * via /v3/lock/updateLockData so remote keyboardPwd/get works (fixes TTLock -1007).
 */
export function resetPasscodeData(lockData: string, lockMac?: string): Promise<string> {
  return runNearLock(lockMac, () => resetPasscodeOnce(lockData));
}

/**
 * Write a custom timed passcode to the lock over BLE.
 * `lockData` must already be decrypted plaintext (never ldw1/lds1).
 */
export function createCustomPasscode(
  passcode: string,
  startDateMs: number,
  endDateMs: number,
  lockData: string,
  lockMac?: string,
): Promise<void> {
  return runNearLock(lockMac, () =>
    createCustomPasscodeOnce(passcode, startDateMs, endDateMs, lockData),
  );
}
