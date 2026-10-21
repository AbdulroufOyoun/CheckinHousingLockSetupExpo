import type {
  BootstrapData,
  FacilityModel,
  FloorSection,
  PropertyType,
  RoomModel,
  SiteUnitModel,
  SuiteModel,
} from '@/src/types/models';
import type { SiteDetailPropertyType } from '@/src/constants/siteDetailTypes';

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

export function findFloor(data: BootstrapData | undefined, id: number): FloorSection | undefined {
  return data?.floors.find((f) => f.id === id);
}

export function findBuilding(data: BootstrapData | undefined, id: number): SiteUnitModel | undefined {
  return data?.buildings?.find((b) => b.id === id);
}

export function findGate(data: BootstrapData | undefined, id: number): SiteUnitModel | undefined {
  return data?.gates?.find((g) => g.id === id);
}

export function findElevator(data: BootstrapData | undefined, id: number): SiteUnitModel | undefined {
  return data?.elevators?.find((e) => e.id === id);
}

export function findParking(data: BootstrapData | undefined, id: number): SiteUnitModel | undefined {
  return data?.parkings?.find((p) => p.id === id);
}

export function findSiteUnit(
  data: BootstrapData | undefined,
  type: SiteDetailPropertyType,
  id: number,
): SiteUnitModel | undefined {
  switch (type) {
    case 'building':
      return findBuilding(data, id);
    case 'gate':
      return findGate(data, id);
    case 'elevator':
      return findElevator(data, id);
    case 'parking':
      return findParking(data, id);
    default:
      return undefined;
  }
}

export function getPropertyEntity(
  data: BootstrapData | undefined,
  type: PropertyType,
  id: number,
): RoomModel | SuiteModel | FacilityModel | FloorSection | SiteUnitModel | undefined {
  switch (type) {
    case 'room':
      return findRoom(data, id);
    case 'suite':
      return findSuite(data, id);
    case 'facility':
      return findFacility(data, id);
    case 'floor':
      return findFloor(data, id);
    case 'building':
      return findBuilding(data, id);
    case 'gate':
      return findGate(data, id);
    case 'elevator':
      return findElevator(data, id);
    case 'parking':
      return findParking(data, id);
    default:
      return undefined;
  }
}

export function siteUnitTitle(entity: SiteUnitModel | FloorSection, type: PropertyType): string {
  if (type === 'floor' && 'label' in entity) {
    return entity.label;
  }
  if ('name' in entity) {
    return entity.name;
  }
  return String(entity.id);
}
