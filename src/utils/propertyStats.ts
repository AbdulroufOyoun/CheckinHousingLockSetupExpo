import type { FloorSection, RoomModel, SuiteModel } from '@/src/types/models';

export type PropertyLockFilter = 'all' | 'linked' | 'noLock';

export type PropertyUnitStats = {
  suites: number;
  rooms: number;
  withLock: number;
  withoutLock: number;
};

function unitMatchesLockFilter(hasLock: boolean, filter: PropertyLockFilter): boolean {
  if (filter === 'linked') return hasLock;
  if (filter === 'noLock') return !hasLock;
  return true;
}

function matchesQuery(text: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  return text.toLowerCase().includes(q);
}

function unitMatchesSearch(
  query: string,
  floorLabelMatch: boolean,
  ...texts: string[]
): boolean {
  if (!query.trim()) return true;
  if (floorLabelMatch) return true;
  return texts.some((text) => matchesQuery(text, query));
}

function filterRoom(
  room: RoomModel,
  query: string,
  lockFilter: PropertyLockFilter,
  floorLabelMatch: boolean,
): boolean {
  if (!unitMatchesLockFilter(room.has_lock, lockFilter)) return false;
  return unitMatchesSearch(query, floorLabelMatch, String(room.number));
}

function filterSuite(
  suite: SuiteModel,
  query: string,
  lockFilter: PropertyLockFilter,
  floorLabelMatch: boolean,
): boolean {
  if (!unitMatchesLockFilter(suite.has_lock, lockFilter)) return false;
  return unitMatchesSearch(
    query,
    floorLabelMatch,
    String(suite.number),
    `suite ${suite.number}`,
  );
}

export function countPropertyUnits(floors: FloorSection[]): PropertyUnitStats {
  let suites = 0;
  let rooms = 0;
  let withLock = 0;
  let withoutLock = 0;

  for (const floor of floors) {
    for (const suite of floor.suites ?? []) {
      suites += 1;
      if (suite.has_lock) withLock += 1;
      else withoutLock += 1;
    }
    for (const room of floor.rooms ?? []) {
      rooms += 1;
      if (room.has_lock) withLock += 1;
      else withoutLock += 1;
    }
  }

  return { suites, rooms, withLock, withoutLock };
}

export function filterPropertyFloors(
  floors: FloorSection[],
  options: { query?: string; lockFilter?: PropertyLockFilter },
): FloorSection[] {
  const query = options.query ?? '';
  const lockFilter = options.lockFilter ?? 'all';

  const hasQuery = query.trim().length > 0;

  return floors
    .map((floor) => {
      const floorLabelMatch = hasQuery && matchesQuery(floor.label, query);
      const suites = (floor.suites ?? []).filter((s) =>
        filterSuite(s, query, lockFilter, floorLabelMatch),
      );
      const rooms = (floor.rooms ?? []).filter((r) =>
        filterRoom(r, query, lockFilter, floorLabelMatch),
      );
      return { ...floor, suites, rooms };
    })
    .filter((floor) => (floor.suites?.length ?? 0) > 0 || (floor.rooms?.length ?? 0) > 0);
}
