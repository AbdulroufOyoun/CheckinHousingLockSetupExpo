export const SITE_DETAIL_TYPES = ['building', 'gate', 'elevator', 'parking'] as const;
export type SiteDetailPropertyType = (typeof SITE_DETAIL_TYPES)[number];

export function isSiteDetailType(type: string): type is SiteDetailPropertyType {
  return (SITE_DETAIL_TYPES as readonly string[]).includes(type);
}
