export type PropertyType =
  | 'room'
  | 'suite'
  | 'facility'
  | 'building'
  | 'floor'
  | 'gate'
  | 'elevator'
  | 'parking';

export interface SiteUnitModel {
  id: number;
  name: string;
  building_id?: number;
  subtitle?: string;
  direction?: string;
  lock_data: string;
  has_lock: boolean;
  locks: ApiLock[];
  lock?: CloudLock;
}

export type LockVendor = 'ttlock' | 'salto';

export interface ApiLock {
  id: number;
  vendor?: LockVendor;
  lockId: string;
  lockName: string;
  lockMac: string;
  lockAlias: string;
  lockData?: string;
  saltoInstallationId?: string | null;
  saltoDoorId?: string | null;
  saltoUnitId?: string | null;
  saltoDeviceId?: string | null;
  digitalKey?: string;
  keyExpiresAt?: string;
}

export interface CloudLock {
  vendor?: LockVendor;
  lockId: string;
  lockName: string;
  lockData: string;
  lockMac: string;
  lockAlias: string;
  dbId?: number;
  digitalKey?: string;
  keyExpiresAt?: string;
  saltoInstallationId?: string | null;
  saltoDoorId?: string | null;
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
  has_lock?: boolean;
  locks?: ApiLock[];
  lock_data?: string;
  lock?: CloudLock;
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

export interface TtlockSyncMeta {
  success?: boolean;
  message?: string;
  count?: number | null;
}

export interface PaginatedTenantLocks {
  status: string;
  locks: TenantLockRecord[];
  count: number;
  total: number;
  current_page: number;
  last_page: number;
  per_page: number;
  ttlock_sync?: TtlockSyncMeta;
}

export interface UnlockHistoryEntry {
  id?: number;
  user_name?: string;
  created_at?: string;
  unlocked_at?: string;
  unit_type?: string;
  room_number?: string | number;
}

export interface LockCurrentLink {
  type: PropertyType;
  id: number;
  label: string;
  linked_at?: string;
}

export interface LockDetailRecord {
  id: number;
  vendor?: LockVendor;
  lockId: string;
  lockName: string;
  lockAlias: string;
  lockMac?: string;
  lockData?: string;
  saltoInstallationId?: string | null;
  saltoDoorId?: string | null;
  saltoUnitId?: string | null;
  saltoDeviceId?: string | null;
  electricQuantity?: number;
  is_linked?: boolean;
  added_to_system_at?: string | null;
  linked_to_context_at?: string | null;
  current_links?: LockCurrentLink[];
  link_timeline?: LockLinkTimelineEntry[];
}

export interface LockLinkTimelineEntry {
  id: number;
  lock_id: number;
  property_type: string;
  property_id: number;
  property_label: string;
  action: 'linked' | 'unlinked';
  occurred_at: string;
}

export interface PropertyDetailContext {
  id: number;
  number?: string;
  name?: string;
  label?: string;
  capacity?: number;
  floor_label?: string;
  building_name?: string;
  suite_number?: string;
  room_type?: { id: number; name: string };
}

export interface PropertyDetailResponse {
  property_type: PropertyType;
  property_id: number;
  property: PropertyDetailContext;
  locks: LockDetailRecord[];
  primary_lock_id?: number;
  link_timeline: LockLinkTimelineEntry[];
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
  buildings: SiteUnitModel[];
  gates: SiteUnitModel[];
  elevators: SiteUnitModel[];
  parkings: SiteUnitModel[];
}
