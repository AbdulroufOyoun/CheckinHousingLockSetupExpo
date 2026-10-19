import type { BootstrapData, CloudLock } from '@/src/types/models';

export interface TenantRuntimeCache {
  bootstrap: BootstrapData | null;
  cloudLocks: CloudLock[];
}

let cache: TenantRuntimeCache = {
  bootstrap: null,
  cloudLocks: [],
};

export function getTenantCache(): TenantRuntimeCache {
  return cache;
}

export function setBootstrap(data: BootstrapData | null): void {
  cache = { ...cache, bootstrap: data };
}

export function setCloudLocks(locks: CloudLock[]): void {
  cache = { ...cache, cloudLocks: locks };
}

export function clearTenantCaches(): void {
  cache = { bootstrap: null, cloudLocks: [] };
}
