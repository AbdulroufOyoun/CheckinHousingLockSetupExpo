/**
 * Expand older/obfuscated TTLock lockData JSON (short keys) to canonical field names.
 * SDK 3.5.x EncryptionUtil.parseLockData requires literal "adminPwd": after AES unwrap
 * or it returns LockError "parameter error".
 */

const FIELD_MAP: Record<string, string> = {
  h: 'lockName',
  i: 'lockMac',
  j: 'lockVersion',
  k: 'adminPwd',
  l: 'lockKey',
  m: 'lockFlagPos',
  n: 'noKeyPwd',
  p: 'pwdInfo',
  q: 'timestamp',
  r: 'aesKeyStr',
  s: 'specialValue',
  t: 'featureValue',
  u: 'electricQuantity',
  v: 'timezoneRawOffset',
  w: 'modelNum',
  x: 'hardwareRevision',
  y: 'firmwareRevision',
};

const LOCK_VERSION_MAP: Record<string, string> = {
  a: 'protocolType',
  b: 'protocolVersion',
  c: 'scene',
  d: 'groupId',
  e: 'orgId',
};

function decodeBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

function encodeBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 1) {
    s += String.fromCharCode(bytes[i]!);
  }
  return btoa(s);
}

function macFromBytes(macBytes: Uint8Array): string {
  const parts: string[] = [];
  for (let i = 0; i < macBytes.length; i += 1) {
    parts.push(macBytes[i]!.toString(16).padStart(2, '0').toUpperCase());
  }
  return parts.join(':');
}

function macToBytes(mac: string): Uint8Array {
  const parts = mac.split(':');
  const out = new Uint8Array(6);
  for (let i = 0; i < 6; i += 1) {
    out[i] = parseInt(parts[i] ?? '0', 16);
  }
  return out;
}

function aesKeyFromMac(mac: string): string {
  return mac.substring(0, 9) + mac.substring(10);
}

async function aes128Cbc(
  direction: 'encrypt' | 'decrypt',
  keyUtf8: string,
  data: Uint8Array,
): Promise<Uint8Array> {
  const keyBytes = new TextEncoder().encode(keyUtf8);
  const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-CBC' }, false, [
    'encrypt',
    'decrypt',
  ]);
  if (direction === 'encrypt') {
    const enc = await crypto.subtle.encrypt({ name: 'AES-CBC', iv: keyBytes }, cryptoKey, data);
    return new Uint8Array(enc);
  }
  const dec = await crypto.subtle.decrypt({ name: 'AES-CBC', iv: keyBytes }, cryptoKey, data);
  return new Uint8Array(dec);
}

function expandShortKeys(short: Record<string, unknown>): Record<string, unknown> {
  const long: Record<string, unknown> = {};
  if (typeof short.C === 'number') {
    long.uid = short.C;
  }
  for (const [sk, lk] of Object.entries(FIELD_MAP)) {
    if (!(sk in short)) continue;
    const value = short[sk];
    if (lk === 'lockVersion' && value && typeof value === 'object') {
      const version: Record<string, unknown> = {};
      const src = value as Record<string, unknown>;
      for (const [a, b] of Object.entries(LOCK_VERSION_MAP)) {
        if (a in src) version[b] = src[a];
      }
      long[lk] = version;
      continue;
    }
    long[lk] = value;
  }
  return long;
}

/** Normalize TTLock opaque lockData for SDK 3.5.x. No-op if already canonical. */
export async function normalizeTtlockOpaqueLockData(lockData: string): Promise<string> {
  const trimmed = lockData.trim();
  if (!trimmed || trimmed.startsWith('ldw1:') || trimmed.startsWith('lds1:')) {
    return trimmed;
  }

  try {
    const raw = decodeBase64(trimmed);
    if (raw.length < 7) return trimmed;
    const macBytes = raw.subarray(raw.length - 6);
    const cipher = raw.subarray(0, raw.length - 6);
    const mac = macFromBytes(macBytes);
    const aesKey = aesKeyFromMac(mac);
    if (aesKey.length !== 16) return trimmed;

    const plainBytes = await aes128Cbc('decrypt', aesKey, cipher);
    const text = new TextDecoder().decode(plainBytes);
    const short = JSON.parse(text) as Record<string, unknown>;
    if (short.adminPwd != null) {
      return trimmed;
    }
    if (typeof short.k !== 'string' || typeof short.i !== 'string') {
      return trimmed;
    }

    const long = expandShortKeys(short);
    if (typeof long.adminPwd !== 'string' || typeof long.lockMac !== 'string') {
      return trimmed;
    }

    const lockMac = String(long.lockMac).toUpperCase();
    long.lockMac = lockMac;
    const json = JSON.stringify(long);
    const enc = await aes128Cbc('encrypt', aesKeyFromMac(lockMac), new TextEncoder().encode(json));
    const outMac = macToBytes(lockMac);
    const merged = new Uint8Array(enc.length + outMac.length);
    merged.set(enc);
    merged.set(outMac, enc.length);
    return encodeBase64(merged);
  } catch {
    return trimmed;
  }
}
