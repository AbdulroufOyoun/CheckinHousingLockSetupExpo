import Constants from 'expo-constants';
import { gcm } from '@noble/ciphers/aes.js';
import { utf8ToBytes } from '@noble/ciphers/utils.js';

const WIRE_PREFIX = 'ldw1:';
const IV_LEN = 12;
const TAG_LEN = 16;

function wireKeyBase64(): string {
  // Metro / .env.local: process.env first. EAS APK: extra is set at build time.
  const fromEnv = process.env.EXPO_PUBLIC_LOCK_DATA_WIRE_KEY;
  if (typeof fromEnv === 'string' && fromEnv.trim() !== '') {
    return fromEnv.trim();
  }
  const fromExtra = Constants.expoConfig?.extra?.lockDataWireKey;
  if (typeof fromExtra === 'string' && fromExtra.trim() !== '') {
    return fromExtra.trim();
  }
  return '';
}

function decodeBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

function decodeWireKey(): Uint8Array | null {
  const b64 = wireKeyBase64();
  if (!b64) {
    return null;
  }
  const raw = decodeBase64(b64);
  if (raw.length !== 32) {
    return null;
  }
  return raw;
}

/**
 * Decrypt API lockData (ldw1) to TTLock SDK plaintext. Legacy plaintext passes through.
 */
export function decryptLockDataWire(wire: string, lockDbId: number): string {
  const trimmed = wire.trim();
  if (!trimmed || !trimmed.startsWith(WIRE_PREFIX)) {
    return trimmed;
  }

  const key = decodeWireKey();
  if (!key) {
    throw new Error('Missing LOCK_DATA wire key — set EXPO_PUBLIC_LOCK_DATA_WIRE_KEY at build time');
  }

  const packed = decodeBase64(trimmed.slice(WIRE_PREFIX.length));
  if (packed.length < IV_LEN + TAG_LEN + 1) {
    throw new Error('Invalid encrypted lockData');
  }

  const iv = packed.subarray(0, IV_LEN);
  const tag = packed.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ciphertext = packed.subarray(IV_LEN + TAG_LEN);
  const combined = new Uint8Array(ciphertext.length + tag.length);
  combined.set(ciphertext);
  combined.set(tag, ciphertext.length);

  const aad = utf8ToBytes(`lock:${lockDbId}`);
  const aes = gcm(key, iv, aad);
  const plainBytes = aes.decrypt(combined);

  // Byte-identical to PHP/openssl_decrypt string (TTLock JSON may include non-ASCII).
  let out = '';
  for (let i = 0; i < plainBytes.length; i += 1) {
    out += String.fromCharCode(plainBytes[i]!);
  }
  return out;
}

export function hasWireLockDataKeyConfigured(): boolean {
  return decodeWireKey() !== null;
}

export function resolveApiLockData(api: {
  id?: number;
  dbId?: number;
  lockData?: string | null;
}): string {
  const raw = api.lockData ?? '';
  const lockDbId = api.id ?? api.dbId;
  if (lockDbId && raw.trim().startsWith(WIRE_PREFIX)) {
    return decryptLockDataWire(raw, lockDbId);
  }
  return raw;
}
