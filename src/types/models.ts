export type PropertyType = 'room' | 'suite' | 'facility';

export interface ApiLock {
  id: number;
  lockId: string;
  lockName: string;
  lockMac: string;
  lockAlias: string;
  lockData?: string;
}

export interface CloudLock {
  lockId: string;
  lockName: string;
  lockData: string;
  lockMac: string;
  lockAlias: string;
  dbId?: number;
}

export interface RoomModel {
  id: number;
  building_id: number;
  floor_id: number;
  suite_id: number;
  number: string;
  room_types_id: number;
  capacity: number;
  lock_data: string;
  has_lock: boolean;
  locks: ApiLock[];
  lock?: CloudLock;
}

export interface SuiteModel {
  id: number;
  building_id: number;
  floor_id: number;
  number: string;
  lock_id: string;
  has_lock: boolean;
  locks: ApiLock[];
  rooms: RoomModel[];
  lock?: CloudLock;
}

export interface FacilityModel {
  id: number;
  name_ar: string;
  name_en: string;
  building_id: number;
  floor_id: number;
  suite_id: number;
  room_types_id: number;
  lock_data: string;
  has_lock: boolean;
  locks: ApiLock[];
  lock?: CloudLock;
  room_type?: { id: number; name_ar: string; name_en: string };
}

export interface FloorSection {
  id: number;
  number: string;
  building_id: number;
  building_name: string;
  label: string;
  rooms: RoomModel[];
  suites: SuiteModel[];
}

export interface TenantSummary {
  id: string;
  name: string;
  domain: string | null;
  active: boolean;
}

export interface TenantLockRecord {
  id: number;
  lockId: string;
  lockAlias: string;
  lockName: string;
  lockMac: string;
  electricQuantity?: number;
}

export interface UnlockHistoryEntry {
  id?: number;
  user_name?: string;
  created_at?: string;
  unit_type?: string;
  room_number?: string | number;
}

export interface PaginatedHistory {
  data: UnlockHistoryEntry[];
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
}

export interface BootstrapData {
  tenant_id: string;
  domain: string | null;
  suites: SuiteModel[];
  rooms: RoomModel[];
  floors: FloorSection[];
  facilities: FacilityModel[];
}
