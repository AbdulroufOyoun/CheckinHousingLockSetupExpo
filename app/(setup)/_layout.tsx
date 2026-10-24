import { Stack } from 'expo-router';

import { useEnsureBlePermissionsWhenAuthenticated } from '@/src/hooks/useEnsureBlePermissionsWhenAuthenticated';
import { colors } from '@/src/theme/colors';

export default function SetupLayout() {
  useEnsureBlePermissionsWhenAuthenticated();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.surface },
      }}
    >
      <Stack.Screen name="tenants" options={{ title: '' }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ title: '' }} />
      <Stack.Screen name="property/[type]/[id]" options={{ title: '' }} />
      <Stack.Screen name="property/room/[id]" options={{ title: '' }} />
      <Stack.Screen name="locks/quick-provision" options={{ title: '' }} />
      <Stack.Screen name="locks/salto-link" options={{ title: '' }} />
      <Stack.Screen name="locks/[lockDbId]" options={{ title: '' }} />
    </Stack>
  );
}
