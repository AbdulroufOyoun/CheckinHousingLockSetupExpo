import type { ApiLock, CloudLock, FacilityModel, RoomModel, SuiteModel } from '@/src/types/models';

export function apiLockToCloud(api: ApiLock): CloudLock {
  return {
    lockId: api.lockId,
    lockName: api.lockName,
    lockMac: api.lockMac,
    lockAlias: api.lockAlias,
    lockData: api.lockData ?? '',
    dbId: api.id,
  };
}

export function mergeCloudLock(apiLock: CloudLock | undefined, cloudList: CloudLock[]): CloudLock | undefined {
  if (!apiLock) return undefined;
  let lock = { ...apiLock };
  if (lock.lockData) return lock;

  const match = findInCloudList(lock, cloudList);
  if (match) {
    lock = { ...lock, ...match, dbId: lock.dbId ?? match.dbId };
  }
  return lock;
}

function findInCloudList(lock: CloudLock, cloudList: CloudLock[]): CloudLock | undefined {
  if (lock.dbId) {
    const byDb = cloudList.find((c) => c.dbId === lock.dbId);
    if (byDb) return byDb;
  }
  if (lock.lockId) {
    const byId = cloudList.find((c) => c.lockId === lock.lockId);
    if (byId) return byId;
  }
  if (lock.lockMac) {
    const byMac = cloudList.find((c) => c.lockMac.toLowerCase() === lock.lockMac.toLowerCase());
    if (byMac) return byMac;
  }
  if (lock.lockAlias) {
    const byAlias = cloudList.find((c) => c.lockAlias === lock.lockAlias);
    if (byAlias) return byAlias;
  }
  return undefined;
}

export function applyBootstrapLock<T extends { locks: ApiLock[]; has_lock: boolean; lock?: CloudLock }>(
  entity: T,
  cloudList: CloudLock[],
): T {
  const copy = { ...entity };
  if (copy.locks?.length) {
    const api = copy.locks[0];
    copy.lock = mergeCloudLock(
      {
        lockId: api.lockId,
        lockName: api.lockName,
        lockMac: api.lockMac,
        lockAlias: api.lockAlias,
        lockData: api.lockData ?? '',
        dbId: api.id,
      },
      cloudList,
    );
    copy.has_lock = true;
  }
  return copy;
}

export function enrichBootstrap(
  bootstrap: import('@/src/types/models').BootstrapData,
  cloudList: CloudLock[],
) {
  const enrichSiteList = <T extends { locks: ApiLock[]; has_lock: boolean; lock?: CloudLock }>(
    list: T[],
  ): T[] => list.map((item) => applyBootstrapLock(item, cloudList));

  const floors = (bootstrap.floors ?? []).map((floor) => {
    const withFloorLock = floor.locks?.length
      ? applyBootstrapLock(
          {
            locks: floor.locks,
            has_lock: floor.has_lock ?? false,
            lock: floor.lock,
          },
          cloudList,
        )
      : null;
    return {
      ...floor,
      ...(withFloorLock
        ? {
            locks: withFloorLock.locks,
            has_lock: withFloorLock.has_lock,
            lock: withFloorLock.lock,
          }
        : {}),
      rooms: (floor.rooms ?? []).map((r) => applyBootstrapLock(r, cloudList)),
      suites: (floor.suites ?? []).map((s) => ({
        ...applyBootstrapLock(s, cloudList),
        rooms: (s.rooms ?? []).map((r) => applyBootstrapLock(r, cloudList)),
      })),
    };
  });
  const facilities = enrichSiteList(bootstrap.facilities ?? []);
  const buildings = enrichSiteList(bootstrap.buildings ?? []);
  const gates = enrichSiteList(bootstrap.gates ?? []);
  const elevators = enrichSiteList(bootstrap.elevators ?? []);
  const parkings = enrichSiteList(bootstrap.parkings ?? []);
  return { ...bootstrap, floors, facilities, buildings, gates, elevators, parkings };
}

export function resolveLockData(
  lock: CloudLock | undefined,
  cloudList: CloudLock[],
): string | null {
  if (!lock) return null;
  const merged = mergeCloudLock(lock, cloudList);
  if (merged?.lockData) return merged.lockData;
  return null;
}

export function facilityDisplayName(f: FacilityModel, locale: string): string {
  return locale.startsWith('ar') ? f.name_ar || f.name_en : f.name_en || f.name_ar;
}
