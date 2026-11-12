import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';

/** First 16 hex chars of SHA-256 (matches PHP hash on TTLock binary lockData string). */
export function lockDataSha256Prefix(plain: string): string {
  if (!plain) return '';
  const bytes = new Uint8Array(plain.length);
  for (let i = 0; i < plain.length; i += 1) {
    bytes[i] = plain.charCodeAt(i) & 0xff;
  }
  return bytesToHex(sha256(bytes)).slice(0, 16);
}
