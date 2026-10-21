import { PermissionsAndroid, Platform, type Permission } from 'react-native';

function requiredAndroidPermissions(): Permission[] {
  const apiLevel = Platform.Version;
  if (typeof apiLevel === 'number' && apiLevel >= 31) {
    return [
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ];
  }
  return [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
}

/** True when every BLE-related runtime permission is already granted. */
export async function hasBlePermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }
  const perms = requiredAndroidPermissions();
  const checks = await Promise.all(perms.map((p) => PermissionsAndroid.check(p)));
  return checks.every(Boolean);
}

/**
 * Requests missing permissions only. Safe to call right after login; no dialog if already granted.
 */
export async function ensureBlePermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }
  if (await hasBlePermissions()) {
    return true;
  }
  const perms = requiredAndroidPermissions();
  if (perms.length === 1) {
    const result = await PermissionsAndroid.request(perms[0]!);
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }
  const results = await PermissionsAndroid.requestMultiple(perms);
  return perms.every((p) => results[p] === PermissionsAndroid.RESULTS.GRANTED);
}
