let override: string | null = null;

export function getApiBaseOverride(): string | null {
  return override;
}

export function setApiBaseOverride(url: string | null): void {
  override = url?.trim() ? url.trim().replace(/\/+$/, '') : null;
}
