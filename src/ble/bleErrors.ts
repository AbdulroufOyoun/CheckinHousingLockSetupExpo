/** Maps TTLock SDK / bridge errors to i18n keys (pass to t()). */
export function bleErrorI18nKey(message: string): string | null {
  const m = message.toLowerCase();
  if (m.includes('connect timeout') || m.includes('connection disconnected') || m.includes('connect fail')) {
    return 'bleConnectTimeout';
  }
  if (m.includes('not in setting mode') || m.includes('no setting mode')) {
    return 'lockNotInSettingMode';
  }
  if (m.includes('permission') || m.includes('unauthorized')) {
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
  const key = bleErrorI18nKey(raw);
  return key ? t(key) : raw;
}
