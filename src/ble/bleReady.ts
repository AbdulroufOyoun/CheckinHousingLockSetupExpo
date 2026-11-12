import { BluetoothState, Ttlock } from 'react-native-ttlock';

import { ensureBlePermissions } from '@/src/ble/permissions';

function readBluetoothState(): Promise<BluetoothState> {
  return new Promise((resolve) => {
    Ttlock.getBluetoothState((state: BluetoothState) => resolve(state));
  });
}

/**
 * Permissions + radio must be ready before any TTLock BLE command (scan/unlock/passcode/init).
 */
export async function ensureBleReady(): Promise<void> {
  const permitted = await ensureBlePermissions();
  if (!permitted) {
    throw new Error('BLE_PERMISSIONS');
  }

  const state = await readBluetoothState();
  if (state === BluetoothState.Off) {
    throw new Error('BLE_OFF');
  }
  if (state === BluetoothState.Unauthorized) {
    throw new Error('BLE_PERMISSIONS');
  }
  if (state === BluetoothState.Unsupported) {
    throw new Error('BLE_UNSUPPORTED');
  }
  // Unknown / Resetting: still attempt — SDK may become On mid-op.
}

export function isBleRetryableError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m === 'ble_passcode_timeout' ||
    m.includes('ble_passcode_timeout') ||
    m.includes('connect timeout') ||
    m.includes('connection disconnected') ||
    m.includes('disconnected') ||
    m.includes('connect fail') ||
    m.includes('lock is busy') ||
    m.includes('bluetooth is disable') ||
    m.includes('bluetooth is disabled') ||
    (m.includes('not init') && m.includes('bluetooth'))
  );
}
