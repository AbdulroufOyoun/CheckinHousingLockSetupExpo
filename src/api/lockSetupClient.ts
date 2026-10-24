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

const REQUEST_TIMEOUT_MS = 45_000;

function isNetworkFailureMessage(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('network request failed') ||
    m.includes('fetch failed') ||
    m.includes('failed to connect') ||
    m.includes('could not connect') ||
    m.includes('request has been canceled') ||
    m.includes('aborted')
  );
}

function networkUnreachableError(): ApiError {
  const base = getApiBase();
  return new ApiError(
    base
      ? `NETWORK_UNREACHABLE:${base}`
      : 'NETWORK_UNREACHABLE:',
    0,
  );
}

async function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw networkUnreachableError();
    }
    if (e instanceof Error && isNetworkFailureMessage(e.message)) {
      throw networkUnreachableError();
    }
    throw new ApiError(
      e instanceof Error ? e.message : `Network error contacting ${getApiBase()}`,
      0,
    );
  } finally {
    clearTimeout(timer);
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
let onTenantAccessDenied: UnauthorizedHandler | null = null;

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

export function setTenantAccessDeniedHandler(handler: UnauthorizedHandler | null): void {
  onTenantAccessDenied = handler;
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
  if (response.status === 403 && root.message?.toLowerCase().includes('not authorized to access this tenant')) {
    onTenantAccessDenied?.();
    throw new ApiError(root.message || 'Forbidden', 403, raw);
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
  const response = await fetchWithTimeout(url, { ...init, headers });
  return parseEnvelope<T>(response);
}

export function normalizeMobileInput(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('966')) {
    return digits.slice(-10);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

export async function loginLockSetup(body: {
  email?: string;
  mobile?: string;
  password: string;
}): Promise<{ token: string; name: string; id: number }> {
  const payload: Record<string, string> = { password: body.password };
  if (body.email) {
    payload.email = body.email.trim();
  } else if (body.mobile) {
    payload.mobile = normalizeMobileInput(body.mobile);
  }

  const url = `${getApiBase()}/api/lock-setup/login`;
  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = await parseEnvelope<{
    token: string;
    name: string;
    id: number;
  }>(response);
  if (!data?.token) {
    throw new ApiError('Login succeeded but no token in response', 502);
  }
  return data;
}

export async function fetchTenants(): Promise<{ tenants: import('@/src/types/models').TenantSummary[] }> {
  const data = await request<
    { tenants: import('@/src/types/models').TenantSummary[] } | import('@/src/types/models').TenantSummary[]
  >(`${getApiBase()}/api/lock-setup/tenants`);
  if (Array.isArray(data)) {
    return { tenants: data };
  }
  return { tenants: data?.tenants ?? [] };
}

export async function fetchBootstrap(): Promise<import('@/src/types/models').BootstrapData> {
  return request(tenantPath('/bootstrap'));
}

export async function fetchTenantLocks(
  status: string,
  options: {
    syncBefore?: boolean;
    page?: number;
    perPage?: number;
    search?: string;
  } = {},
): Promise<import('@/src/types/models').PaginatedTenantLocks> {
  const page = options.page ?? 1;
  const perPage = options.perPage ?? 20;
  let path = tenantPath(
    `/locks?status=${encodeURIComponent(status)}&page=${page}&per_page=${perPage}`,
  );
  // sync_before ignored — locks come from tenant DB only (no TTLock cloud).
  const search = options.search?.trim();
  if (search) {
    path += `&search=${encodeURIComponent(search)}`;
  }
  return request(path);
}

export async function fetchTtlockToken(): Promise<{ access_token: string }> {
  return request(tenantPath('/locks/ttlock/token'));
}

export async function syncTtlock(): Promise<{ locks?: unknown[]; message?: string } & Record<string, unknown>> {
  return request(tenantPath('/locks/ttlock/sync'), { method: 'POST' });
}

export async function registerLock(
  body: Record<string, unknown>,
): Promise<import('@/src/types/models').ApiLock> {
  return request(tenantPath('/locks'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function fetchSaltoDoors(installationId?: string): Promise<{
  doors: Array<{
    id: string;
    name: string;
    installation_id: string | null;
    unit_id: string | null;
  }>;
}> {
  let path = tenantPath('/locks/salto/doors');
  if (installationId?.trim()) {
    path += `?installation_id=${encodeURIComponent(installationId.trim())}`;
  }
  return request(path);
}

export async function fetchSaltoSetupKey(lockDbId: number): Promise<{
  digitalKey: string;
  keyExpiresAt: string;
}> {
  return request(tenantPath(`/locks/${lockDbId}/salto-key`));
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

export async function fetchPropertyDetail(
  propertyType: string,
  propertyId: number,
): Promise<import('@/src/types/models').PropertyDetailResponse> {
  return request(
    tenantPath(`/properties/${propertyType}/${propertyId}`),
  );
}

export async function fetchLockDetail(lockDbId: number): Promise<import('@/src/types/models').LockDetailRecord> {
  return request(tenantPath(`/locks/${lockDbId}`));
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
