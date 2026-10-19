import { useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchBootstrap, fetchTtlockToken } from '@/src/api/lockSetupClient';
import { fetchCloudLocks } from '@/src/api/ttlockCloud';
import { setBootstrap, setCloudLocks } from '@/src/services/tenantCache';
import { enrichBootstrap } from '@/src/utils/lockMerge';

export function useBootstrap(tenantId: string | null) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: ['bootstrap', tenantId],
    enabled: Boolean(tenantId),
    queryFn: async () => {
      const raw = await fetchBootstrap();
      let cloudLocks: Awaited<ReturnType<typeof fetchCloudLocks>> = [];
      try {
        const { access_token } = await fetchTtlockToken();
        cloudLocks = await fetchCloudLocks(access_token);
      } catch {
        cloudLocks = [];
      }
      setCloudLocks(cloudLocks);
      const enriched = enrichBootstrap(raw, cloudLocks);
      setBootstrap(enriched);
      return enriched;
    },
    staleTime: 30_000,
    retry: 1,
  });
}

export function useInvalidateBootstrap() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['bootstrap'] });
}
