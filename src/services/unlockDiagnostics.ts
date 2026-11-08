import Constants from 'expo-constants';
import type { TFunction } from 'i18next';

import { hasWireLockDataKeyConfigured } from '@/src/crypto/lockDataWire';
import { getApiBase } from '@/src/config/env';
import type { CloudLock } from '@/src/types/models';

const WIRE_PREFIX = 'ldw1:';
const STORAGE_PREFIX = 'lds1:';

export type LockDataFormat = 'empty' | 'wire_ldw1' | 'storage_lds1' | 'plain' | 'unknown';

export function lockDataFormat(value: string): LockDataFormat {
  const t = value.trim();
  if (!t) return 'empty';
  if (t.startsWith(WIRE_PREFIX)) return 'wire_ldw1';
  if (t.startsWith(STORAGE_PREFIX)) return 'storage_lds1';
  if (t.length >= 80 && t.length <= 4000) return 'plain';
  return 'unknown';
}

export type UnlockDiagnostic = {
  appVersion: string;
  apiBase: string;
  wireKey: 'ok' | 'missing';
  lockDbId?: number;
  lockMac?: string;
  lockAlias?: string;
  lockCloudId?: string;
  rawFormat: LockDataFormat;
  rawLen: number;
  resolvedFormat: LockDataFormat;
  resolvedLen: number;
  stage: 'precheck' | 'decrypt' | 'ttlock';
  nativeMessage?: string;
  hint?: string;
  resolvedPreview?: string;
};

export function buildUnlockDiagnostic(
  apiLock: CloudLock,
  raw: string,
  resolved: string,
  stage: UnlockDiagnostic['stage'],
  extra?: Pick<UnlockDiagnostic, 'nativeMessage' | 'hint'>,
): UnlockDiagnostic {
  const resolvedPreview =
    resolved.length > 0 ? `${resolved.slice(0, 8)}…` : undefined;

  return {
    appVersion: Constants.expoConfig?.version ?? '?',
    apiBase: getApiBase(),
    wireKey: hasWireLockDataKeyConfigured() ? 'ok' : 'missing',
    lockDbId: apiLock.dbId,
    lockMac: apiLock.lockMac,
    lockAlias: apiLock.lockAlias,
    lockCloudId: apiLock.lockId,
    rawFormat: lockDataFormat(raw),
    rawLen: raw.length,
    resolvedFormat: lockDataFormat(resolved),
    resolvedLen: resolved.length,
    stage,
    resolvedPreview,
    ...extra,
  };
}

export class UnlockError extends Error {
  readonly diagnostic: UnlockDiagnostic;

  constructor(message: string, diagnostic: UnlockDiagnostic) {
    super(message);
    this.name = 'UnlockError';
    this.diagnostic = diagnostic;
  }
}

function formatLabel(t: TFunction, key: string): string {
  const k = `unlockDiag_${key}`;
  const out = t(k);
  return out === k ? key : out;
}

export function formatUnlockDiagnosticBlock(d: UnlockDiagnostic, t: TFunction): string {
  const lines = [
    formatLabel(t, 'title'),
    `— ${formatLabel(t, 'stage')}: ${d.stage}`,
    `— ${formatLabel(t, 'app')}: v${d.appVersion} · ${formatLabel(t, 'wireKey')}: ${d.wireKey === 'ok' ? 'OK' : 'MISSING'}`,
    `— API: ${d.apiBase}`,
    `— ${formatLabel(t, 'lock')}: db #${d.lockDbId ?? '—'} · MAC ${d.lockMac ?? '—'}`,
    d.lockAlias ? `— Alias: ${d.lockAlias}` : null,
    `— ${formatLabel(t, 'fromApi')}: ${d.rawFormat} (${d.rawLen} ${formatLabel(t, 'chars')})`,
    `— ${formatLabel(t, 'forSdk')}: ${d.resolvedFormat} (${d.resolvedLen} ${formatLabel(t, 'chars')})${
      d.resolvedLen > 0 ? ` · ${d.resolvedPreview ?? ''}` : ''
    }`,
    d.hint ? `\n${d.hint}` : null,
    d.nativeMessage ? `\nTTLock: ${d.nativeMessage}` : null,
  ].filter(Boolean);

  return lines.join('\n');
}

export function hintForDiagnostic(d: UnlockDiagnostic, t: TFunction): string {
  if (d.wireKey === 'missing' && d.rawFormat === 'wire_ldw1') {
    return t('unlockDiagHintNoWireKey');
  }
  if (d.resolvedFormat === 'wire_ldw1' || d.resolvedFormat === 'storage_lds1') {
    return t('unlockDiagHintStillEncrypted');
  }
  if (d.resolvedFormat === 'unknown' || d.resolvedLen < 80) {
    return t('unlockDiagHintBadLength');
  }
  if (d.stage === 'ttlock' && d.resolvedFormat === 'plain') {
    return t('unlockDiagHintTtlockReject');
  }
  if (!d.lockDbId) {
    return t('unlockDiagHintNoDbId');
  }
  return t('unlockDiagHintGeneric');
}
