import type { TFunction } from 'i18next';
import { Alert } from 'react-native';

import { formatBleUserMessage, bleErrorI18nKey } from '@/src/ble/bleErrors';
import { getApiBase } from '@/src/config/env';

import { ApiError } from './lockSetupClient';

export type UserErrorContext = 'login' | 'link' | 'provision' | 'unlock' | 'sync' | 'general';

function isTtlockSslError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('curl error 60') ||
    m.includes('ssl certificate problem') ||
    m.includes('ttlock api ssl verification failed')
  );
}

function isTtlockHttpFailure(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes('ttlock api request failed') || m.includes('ttlock obtaintoken');
}

function parseEnvelopeMessage(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const j = JSON.parse(raw) as { message?: string };
    return typeof j.message === 'string' && j.message.trim() ? j.message.trim() : null;
  } catch {
    return null;
  }
}

function mapApiError(e: ApiError, t: TFunction, context: UserErrorContext): string | null {
  if (e.status === 0 && e.message.startsWith('NETWORK_UNREACHABLE:')) {
    const url = e.message.slice('NETWORK_UNREACHABLE:'.length) || getApiBase();
    return t('networkUnreachable', { url: url || '—' });
  }

  const bodyMsg = parseEnvelopeMessage(e.raw) ?? e.message;

  if (e.status === 401) {
    return context === 'login' ? t('loginError') : t('sessionExpired');
  }
  if (e.status === 403) {
    return t('apiTenantForbidden');
  }
  if (e.status === 404) {
    if (bodyMsg.toLowerCase().includes('lock')) {
      return t('apiLockNotFound');
    }
    return t('apiPropertyNotFound');
  }
  if (e.status === 409 || bodyMsg.toLowerCase().includes('already has a lock')) {
    return t('apiPropertyAlreadyHasLock');
  }
  if (e.status === 502 || isTtlockSslError(bodyMsg)) {
    return t('ttlockSslError');
  }
  if (isTtlockHttpFailure(bodyMsg) || isTtlockSslError(e.message)) {
    return t('ttlockSslError');
  }
  if (e.status === 408 || e.status === 504) {
    return t('apiRequestTimeout');
  }

  if (bodyMsg && bodyMsg !== 'Request failed') {
    return bodyMsg;
  }

  return null;
}

function mapPlainMessage(raw: string, t: TFunction, context: UserErrorContext): string | null {
  if (!raw) return null;

  if (raw === 'BLE_PERMISSIONS') {
    return t('blePermissionsRequired');
  }
  if (raw === 'LOCK_NOT_IN_SETTING_MODE') {
    return t('lockNotInSettingMode');
  }
  if (raw === 'BLE_RESCAN_TIMEOUT') {
    return context === 'provision' ? t('bleConnectTimeoutProvision') : t('bleConnectTimeout');
  }
  if (raw === 'No tenant selected') {
    return t('apiNoTenantSelected');
  }
  if (raw === 'No lock linked') {
    return t('unlockNoLockLinked');
  }

  const bleMapped = formatBleUserMessage(raw, t);
  if (bleMapped !== raw || bleErrorI18nKey(raw)) {
    if (context === 'provision' && bleErrorI18nKey(raw) === 'bleConnectTimeout') {
      return t('bleConnectTimeoutProvision');
    }
    return bleMapped;
  }

  if (isTtlockSslError(raw)) {
    return t('ttlockSslError');
  }

  if (raw.includes('Lock synced but not found')) {
    return t('provisionLockMissingAfterSync');
  }
  if (raw.includes('Missing lockData') || raw.includes('Missing lock credentials')) {
    return t('unlockNoLockData');
  }
  if (raw.includes('Invalid JSON response')) {
    return t('apiInvalidResponse');
  }
  if (raw.toLowerCase().includes('ttlock initialize')) {
    const detail = raw.replace(/^TTLock initialize:\s*/i, '').slice(0, 200);
    return t('ttlockCloudInitFailed', { detail });
  }
  if (raw.includes('Failed to load TTLock list')) {
    return t('ttlockCloudListFailed');
  }

  return null;
}

/** User-facing explanation for API, BLE, and cloud errors. */
export function formatUserErrorMessage(
  e: unknown,
  t: TFunction,
  context: UserErrorContext = 'general',
): string {
  if (e instanceof ApiError) {
    const mapped = mapApiError(e, t, context);
    if (mapped) return mapped;
  }

  const raw = e instanceof ApiError ? e.message : e instanceof Error ? e.message : String(e ?? '');

  const plain = mapPlainMessage(raw, t, context);
  if (plain) return plain;

  if (e instanceof ApiError && e.status) {
    return t('apiHttpStatus', { status: e.status, message: raw || t('errorGeneric') });
  }

  return raw.trim() || t('errorGeneric');
}

/** @deprecated use formatUserErrorMessage */
export function formatApiErrorMessage(e: unknown, t: TFunction): string {
  return formatUserErrorMessage(e, t, 'general');
}

export function showUserErrorAlert(
  t: TFunction,
  e: unknown,
  context: UserErrorContext = 'general',
): void {
  Alert.alert(t('errorTitle'), formatUserErrorMessage(e, t, context));
}
