import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { peekPendingDeepLink } from '@/src/services/pendingDeepLink';
import { resumePendingDeepLink } from '@/src/services/resumePendingDeepLink';
import { useSession } from '@/src/store/session';
import { colors } from '@/src/theme/colors';

export default function Index() {
  const { token, tenantId } = useSession();
  const [checkingPending, setCheckingPending] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token || !tenantId) {
        if (!cancelled) setCheckingPending(false);
        return;
      }
      const pending = await peekPendingDeepLink();
      if (pending) {
        await resumePendingDeepLink();
        return;
      }
      if (!cancelled) {
        setCheckingPending(false);
        router.replace('/(setup)/(tabs)/property');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, tenantId]);

  if (!token) {
    return <Redirect href="/(auth)/login" />;
  }
  if (!tenantId) {
    return <Redirect href="/(setup)/tenants" />;
  }
  if (checkingPending) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }
  return <Redirect href="/(setup)/(tabs)/property" />;
}
