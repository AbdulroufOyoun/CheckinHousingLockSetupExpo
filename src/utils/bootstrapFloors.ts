import type { BootstrapData, FloorSection, RoomModel, SuiteModel } from '@/src/types/models';

function asArray<T>(value: T[] | Record<string, T> | null | undefined): T[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return Object.values(value);
}

/** Same fallback as Java Main.buildFloorSectionsFromLegacy when API returns empty floors. */
export function buildFloorSectionsFromLegacy(
  suites: SuiteModel[],
  rooms: RoomModel[],
): FloorSection[] {
  const map = new Map<number, FloorSection>();

  const ensure = (floorId: number): FloorSection => {
    const existing = map.get(floorId);
    if (existing) return existing;
    const section: FloorSection = {
      id: floorId,
      number: String(floorId),
      building_id: 0,
      building_name: '',
      label: floorId > 0 ? `Floor ${floorId}` : 'Property',
      rooms: [],
      suites: [],
    };
    map.set(floorId, section);
    return section;
  };

  for (const suite of suites) {
    ensure(suite.floor_id ?? 0).suites.push(suite);
  }
  for (const room of rooms) {
    ensure(room.floor_id ?? 0).rooms.push(room);
  }

  return Array.from(map.values());
}

export function normalizeBootstrapPayload(raw: BootstrapData): BootstrapData {
  const suites = asArray(raw.suites);
  const rooms = asArray(raw.rooms);
  let floors = asArray(raw.floors).map((floor) => ({
    ...floor,
    rooms: asArray(floor.rooms),
    suites: asArray(floor.suites).map((suite) => ({
      ...suite,
      rooms: asArray(suite.rooms),
    })),
  }));

  floors = floors.filter(
    (floor) => (floor.rooms?.length ?? 0) > 0 || (floor.suites?.length ?? 0) > 0,
  );

  if (floors.length === 0 && (suites.length > 0 || rooms.length > 0)) {
    floors = buildFloorSectionsFromLegacy(suites, rooms);
  }

  return {
    ...raw,
    suites,
    rooms,
    floors,
    facilities: asArray(raw.facilities),
    buildings: asArray(raw.buildings),
    gates: asArray(raw.gates),
    elevators: asArray(raw.elevators),
    parkings: asArray(raw.parkings),
  };
}
