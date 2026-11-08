import { readFileSync } from 'node:fs';
import { gcm } from '@noble/ciphers/aes.js';
import { utf8ToBytes } from '@noble/ciphers/utils.js';

const WIRE_PREFIX = 'ldw1:';
const IV_LEN = 12;
const TAG_LEN = 16;

function loadWireKey() {
  const fromArg = process.argv[2];
  if (fromArg) return fromArg.trim();
  try {
    const local = readFileSync('.env.local', 'utf8');
    const m = local.match(/EXPO_PUBLIC_LOCK_DATA_WIRE_KEY=(.+)/);
    if (m) return m[1].trim();
  } catch {
    /* ignore */
  }
  throw new Error('Pass wire key base64 as argv[2] or set .env.local');
}

function decodeBase64(b64) {
  return Uint8Array.from(Buffer.from(b64, 'base64'));
}

function decryptLockDataWire(wire, lockDbId, keyB64) {
  const trimmed = wire.trim();
  if (!trimmed.startsWith(WIRE_PREFIX)) return trimmed;
  const key = decodeBase64(keyB64);
  const packed = decodeBase64(trimmed.slice(WIRE_PREFIX.length));
  const iv = packed.subarray(0, IV_LEN);
  const tag = packed.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ciphertext = packed.subarray(IV_LEN + TAG_LEN);
  const combined = new Uint8Array(ciphertext.length + tag.length);
  combined.set(ciphertext);
  combined.set(tag, ciphertext.length);
  const aes = gcm(key, iv, utf8ToBytes(`lock:${lockDbId}`));
  return new TextDecoder().decode(aes.decrypt(combined));
}

const sample = process.env.LDW1_SAMPLE ?? 'ldw1:oS+eKMcgsaIpyaei0kZc0QCoMLerAzqI11WihtKFjpgkqAAtecey/+hVLQ==';
const plain = decryptLockDataWire(sample, 99, loadWireKey());
console.log(plain);
if (plain !== 'test-blob-12345') {
  process.exit(1);
}
