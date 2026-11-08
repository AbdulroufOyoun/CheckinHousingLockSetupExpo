import { readFileSync } from 'node:fs';
import { gcm } from '@noble/ciphers/aes.js';
import { utf8ToBytes } from '@noble/ciphers/utils.js';

const WIRE = process.argv[2];
const KEY_B64 = process.argv[3] ?? '1EzugjLGU0isUF9gsUbC0FTpekzUE7jwbf2Yl0JQNaM=';
const LOCK_ID = Number(process.argv[4] ?? 666);
const EXPECTED_PLAIN_PREFIX = process.argv[5] ?? '0CF9E7';

const IV_LEN = 12;
const TAG_LEN = 16;
const PREFIX = 'ldw1:';

function decodeBase64(b64) {
  return Uint8Array.from(Buffer.from(b64, 'base64'));
}

const key = decodeBase64(KEY_B64);
const packed = decodeBase64(WIRE.trim().slice(PREFIX.length));
const iv = packed.subarray(0, IV_LEN);
const tag = packed.subarray(IV_LEN, IV_LEN + TAG_LEN);
const ciphertext = packed.subarray(IV_LEN + TAG_LEN);
const combined = new Uint8Array(ciphertext.length + tag.length);
combined.set(ciphertext);
combined.set(tag, ciphertext.length);
const aes = gcm(key, iv, utf8ToBytes(`lock:${LOCK_ID}`));
const plainBytes = aes.decrypt(combined);
let plain = '';
for (let i = 0; i < plainBytes.length; i += 1) {
  plain += String.fromCharCode(plainBytes[i]);
}
console.log('plain_len', plain.length);
console.log('plain_prefix', plain.slice(0, 12));
console.log('match_expected_prefix', plain.startsWith(EXPECTED_PLAIN_PREFIX));
