import { getApiBase } from '@/src/config/env';

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public raw?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiEnvelope<T = Record<string, unknown>> {
  success: boolean;
  message: string;
  code?: number;
  data: T;
}

type UnauthorizedHandler = () => void;

let bearerToken: string | null = null;
let selectedTenantId: string | null = null;
let onUnauthorized: UnauthorizedHandler | null = null;

export function setLockSetupBearer(token: string | null): void {
  bearerToken = token;
}

export function getLockSetupBearer(): string | null {
  return bearerToken;
}

export function setSelectedTenantId(tenantId: string | null): void {
  selectedTenantId = tenantId;
}

export function getSelectedTenantId(): string | null {
  return selectedTenantId;
}

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  onUnauthorized = handler;
}

function tenantPath(suffix: string): string {
  if (!selectedTenantId) {
    throw new ApiError('No tenant selected');
  }
  return `${getApiBase()}/api/lock-setup/tenants/${selectedTenantId}${suffix}`;
}

async function parseEnvelope<T>(response: Response): Promise<T> {
  const raw = await response.text();
  let root: ApiEnvelope<T>;
  try {
    root = JSON.parse(raw) as ApiEnvelope<T>;
  } catch {
    throw new ApiError('Invalid JSON response', response.status, raw);
  }
  if (response.status === 401) {
    if (bearerToken) {
      onUnauthorized?.();
    }
    throw new ApiError(root.message || 'Unauthorized', 401, raw);
  }
  if (!response.ok || !root.success) {
    throw new ApiError(root.message || 'Request failed', response.status, raw);
  }
  return root.data;
}

async function request<T>(
  url: string,
  init: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(init.headers as Record<string, string>),
  };
  if (init.auth !== false && bearerToken) {
    headers.Authorization = `Bearer ${bearerToken}`;
  }
  const response = await fetch(url, { ...init, headers });
  return parseEnvelope<T>(response);
}

export async function loginLockSetup(body: {
  email?: string;
  mobile?: string;
  password: string;
}): Promise<{ token: string; name: string; id: number }> {
  const params = new URLSearchParams();
  if (body.email) params.set('email', body.email);
  if (body.mobile) params.set('mobile', body.mobile);
  params.set('password', body.password);

  const url = `${getApiBase()}/api/lock-setup/login`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  const data = await parseEnvelope<{
    token: string;
    name: string;
    id: number;
  }>(response);
  return data;
}

export async function fetchTenants(): Promise<{ tenants: import('@/src/types/models').TenantSummary[] }> {
  return request(`${getApiBase()}/api/lock-setup/tenants`);
}

export async function fetchBootstrap(): Promise<import('@/src/types/models').BootstrapData> {
  return request(tenantPath('/bootstrap'));
}

export async function fetchTenantLocks(
  status: string,
  syncBefore = false,
): Promise<{ locks: import('@/src/types/models').TenantLockRecord[]; count: number }> {
  let path = tenantPath(`/locks?status=${encodeURIComponent(status)}`);
  if (syncBefore) path += '&sync_before=1';
  return request(path);
}

export async function fetchTtlockToken(): Promise<{ access_token: string }> {
  return request(tenantPath('/locks/ttlock/token'));
}

export async function syncTtlock(): Promise<{ locks?: unknown[]; message?: string } & Record<string, unknown>> {
  return request(tenantPath('/locks/ttlock/sync'), { method: 'POST' });
}

export async function linkLock(
  propertyType: string,
  propertyId: number,
  lockDbId: number,
): Promise<unknown> {
  return request(tenantPath(`/properties/${propertyType}/${propertyId}/locks/${lockDbId}`), {
    method: 'POST',
  });
}

export async function unlinkLock(
  propertyType: string,
  propertyId: number,
  lockDbId: number,
): Promise<unknown> {
  return request(tenantPath(`/properties/${propertyType}/${propertyId}/locks/${lockDbId}`), {
    method: 'DELETE',
  });
}

export async function fetchLockUnlockHistory(
  lockDbId: number,
  page: number,
  perPage: number,
): Promise<import('@/src/types/models').PaginatedHistory> {
  return request(
    tenantPath(`/locks/${lockDbId}/unlock-history?page=${page}&per_page=${perPage}`),
  );
}

export async function fetchPropertyUnlockHistory(
  propertyType: string,
  propertyId: number,
  page: number,
  perPage: number,
): Promise<import('@/src/types/models').PaginatedHistory> {
  return request(
    tenantPath(
      `/properties/${propertyType}/${propertyId}/unlock-history?page=${page}&per_page=${perPage}`,
    ),
  );
}
