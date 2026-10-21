import { getTtlockClientId } from '@/src/config/env';
import type { CloudLock } from '@/src/types/models';

const EU_API = 'https://euapi.ttlock.com/v3';
const PAGE_SIZE = 100;

function timestamp(): string {
  return String(Date.now());
}

export async function fetchCloudLocks(accessToken: string): Promise<CloudLock[]> {
  const all: CloudLock[] = [];
  let pageNo = 1;
  let pages = 1;
  const clientId = getTtlockClientId();

  while (pageNo <= pages) {
    const url =
      `${EU_API}/lock/list/?clientId=${encodeURIComponent(clientId)}` +
      `&accessToken=${encodeURIComponent(accessToken)}` +
      `&pageNo=${pageNo}&pageSize=${PAGE_SIZE}&date=${timestamp()}`;
    const response = await fetch(url);
    const json = (await response.json()) as {
      list?: Array<{
        lockId: string;
        lockName: string;
        lockData: string;
        lockMac: string;
        lockAlias: string;
      }>;
      pages?: number;
      errmsg?: string;
    };
    if (!response.ok || json.errmsg) {
      throw new Error(json.errmsg ?? 'Failed to load TTLock list');
    }
    const list = json.list ?? [];
    for (const item of list) {
      all.push({
        lockId: item.lockId,
        lockName: item.lockName,
        lockData: item.lockData,
        lockMac: item.lockMac,
        lockAlias: item.lockAlias,
      });
    }
    pages = json.pages ?? 1;
    pageNo += 1;
  }
  return all;
}

export async function initializeCloudLock(
  accessToken: string,
  lockData: string,
  lockAlias: string,
): Promise<string> {
  const clientId = getTtlockClientId();
  const body = new URLSearchParams({
    clientId,
    accessToken,
    lockData,
    lockAlias,
    date: timestamp(),
  });
  const response = await fetch(`${EU_API}/lock/initialize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  let json: { errmsg?: string; description?: string } | null = null;
  const text = await response.text();
  try {
    json = JSON.parse(text) as { errmsg?: string; description?: string };
  } catch {
    json = null;
  }
  if (!response.ok) {
    const detail = json?.errmsg || json?.description || text || 'TTLock initialize failed';
    throw new Error(`TTLock initialize: ${detail}`);
  }
  return text;
}

export function parseLockIdFromInitializeResponse(raw: string): string | null {
  try {
    const j = JSON.parse(raw) as { lockId?: number | string; lock_id?: number | string };
    const id = j.lockId ?? j.lock_id;
    if (id === undefined || id === null || id === '') {
      return null;
    }
    return String(id);
  } catch {
    return null;
  }
}

/** Real TTLock cloud lockId (required for cloud/admin integrations). */
export async function resolveCloudLockId(
  lockData: string,
  lockAlias: string,
  lockMac: string,
  accessToken: string,
): Promise<string> {
  try {
    const raw = await initializeCloudLock(accessToken, lockData, lockAlias);
    const fromInit = parseLockIdFromInitializeResponse(raw);
    if (fromInit) {
      return fromInit;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const already =
      msg.toLowerCase().includes('already') ||
      msg.toLowerCase().includes('exist') ||
      msg.includes('已');
    if (!already) {
      throw e;
    }
  }

  const mac = lockMac.toLowerCase();
  const clouds = await fetchCloudLocks(accessToken);
  const match = clouds.find((c) => c.lockMac?.toLowerCase() === mac);
  if (match?.lockId && !match.lockId.startsWith('local:')) {
    return match.lockId;
  }

  throw new Error('TTLock lockId not found after initialize');
}

export function findLockDbIdAfterSync(
  syncData: { locks?: Array<{ id: number; lockAlias?: string }> },
  lockAlias: string,
): number {
  const locks = syncData.locks ?? [];
  for (const item of locks) {
    if (item.lockAlias === lockAlias) {
      return item.id;
    }
  }
  return 0;
}
