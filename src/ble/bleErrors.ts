/** Maps TTLock SDK / bridge errors to i18n keys (pass to t()). */
export function bleErrorI18nKey(message: string): string | null {
  const m = message.toLowerCase();
  if (m === 'ble_off' || m.includes('bluetooth is disable') || m.includes('bluetooth is off')) {
    return 'bleOff';
  }
  if (m === 'ble_unsupported' || m.includes('unsupported bluetooth')) {
    return 'bleUnsupported';
  }
  if (
    m.includes('connect timeout') ||
    m.includes('connection disconnected') ||
    m.includes('connect fail') ||
    m === 'ble_passcode_timeout' ||
    m.includes('ble_passcode_timeout') ||
    m.includes('ble_rescan_timeout') ||
    (m.includes('not init') && m.includes('bluetooth'))
  ) {
    return 'bleConnectTimeout';
  }
  if (m.includes('not in setting mode') || m.includes('no setting mode')) {
    return 'lockNotInSettingMode';
  }
  if (m.includes('permission') || m.includes('unauthorized') || m === 'ble_permissions') {
    return 'blePermissionsRequired';
  }
  return null;
}

export function isBleConnectTimeoutError(message: string): boolean {
  return bleErrorI18nKey(message) === 'bleConnectTimeout';
}

export function formatBleUserMessage(raw: string, t: (key: string) => string): string {
  if (raw === 'BLE_PERMISSIONS') {
    return t('blePermissionsRequired');
  }
  if (raw === 'BLE_OFF') {
    return t('bleOff');
  }
  if (raw === 'BLE_UNSUPPORTED') {
    return t('bleUnsupported');
  }
  const key = bleErrorI18nKey(raw);
  return key ? t(key) : raw;
}
