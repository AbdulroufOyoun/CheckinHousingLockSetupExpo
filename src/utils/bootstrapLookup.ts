import type {
  BootstrapData,
  FacilityModel,
  PropertyType,
  RoomModel,
  SuiteModel,
} from '@/src/types/models';

export function findRoom(data: BootstrapData | undefined, id: number): RoomModel | undefined {
  if (!data) return undefined;
  for (const floor of data.floors) {
    const room = floor.rooms.find((r) => r.id === id);
    if (room) return room;
    for (const suite of floor.suites) {
      const nested = suite.rooms.find((r) => r.id === id);
      if (nested) return nested;
    }
  }
  return data.rooms.find((r) => r.id === id);
}

export function findSuite(data: BootstrapData | undefined, id: number): SuiteModel | undefined {
  if (!data) return undefined;
  for (const floor of data.floors) {
    const suite = floor.suites.find((s) => s.id === id);
    if (suite) return suite;
  }
  return data.suites.find((s) => s.id === id);
}

export function findFacility(data: BootstrapData | undefined, id: number): FacilityModel | undefined {
  return data?.facilities.find((f) => f.id === id);
}

export function getPropertyEntity(
  data: BootstrapData | undefined,
  type: PropertyType,
  id: number,
): RoomModel | SuiteModel | FacilityModel | undefined {
  if (type === 'room') return findRoom(data, id);
  if (type === 'suite') return findSuite(data, id);
  return findFacility(data, id);
}
