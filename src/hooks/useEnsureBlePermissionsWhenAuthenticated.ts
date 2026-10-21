import { useEffect, useRef } from 'react';

import { ensureBlePermissions } from '@/src/ble/permissions';
import { useSession } from '@/src/store/session';

/**
 * Prompts for Bluetooth / location runtime permissions once per authenticated session
 * when entering the setup area (covers cold start with saved token).
 */
export function useEnsureBlePermissionsWhenAuthenticated() {
  const { token } = useSession();
  const promptedRef = useRef(false);

  useEffect(() => {
    if (!token) {
      promptedRef.current = false;
      return;
    }
    if (promptedRef.current) {
      return;
    }
    promptedRef.current = true;
    void ensureBlePermissions();
  }, [token]);
}
