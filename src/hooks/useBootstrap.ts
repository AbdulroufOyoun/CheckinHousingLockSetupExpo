import { useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchBootstrap } from '@/src/api/lockSetupClient';
import { setBootstrap, setCloudLocks } from '@/src/services/tenantCache';
import { normalizeBootstrapPayload } from '@/src/utils/bootstrapFloors';
import { enrichBootstrap } from '@/src/utils/lockMerge';

export function useBootstrap(tenantId: string | null) {
  return useQuery({
    queryKey: ['bootstrap', tenantId],
    enabled: Boolean(tenantId),
    queryFn: async () => {
      const raw = normalizeBootstrapPayload(await fetchBootstrap());
      setCloudLocks([]);
      const enriched = enrichBootstrap(raw, []);
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
