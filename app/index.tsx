import { Redirect } from 'expo-router';

import { useSession } from '@/src/store/session';

export default function Index() {
  const { token, tenantId } = useSession();
  if (!token) {
    return <Redirect href="/(auth)/login" />;
  }
  if (!tenantId) {
    return <Redirect href="/(setup)/tenants" />;
  }
  return <Redirect href="/(setup)/(tabs)/property" />;
}
