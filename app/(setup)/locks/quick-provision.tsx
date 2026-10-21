import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';

import { ScanLocksPanel } from '@/src/components/ScanLocksPanel';
import { Screen } from '@/src/components/ui/Screen';
import { useInvalidateBootstrap } from '@/src/hooks/useBootstrap';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { spacing } from '@/src/theme/tokens';
import { showUserErrorAlert } from '@/src/api/formatApiError';
import { registerLocalOnly } from '@/src/services/provisionService';
import { colors } from '@/src/theme/colors';

export default function QuickProvisionScreen() {
  const { t } = useTranslation();
  const { pageContentStyle } = useResponsiveLayout();
  const invalidate = useInvalidateBootstrap();
  const [busy, setBusy] = useState(false);

  return (
    <Screen edges={['bottom', 'left', 'right']} style={[styles.pad, pageContentStyle]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('programNewLock'),
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }}
      />
      <View style={{ flex: 1 }}>
        <ScanLocksPanel
          autoStart
          onInitialized={async (lockData, device) => {
            if (busy) return;
            setBusy(true);
            try {
              const alias = `Lock_${Date.now()}`;
              await registerLocalOnly(alias, lockData, device);
              await invalidate();
              Alert.alert(t('done'), t('linkSuccess'));
            } catch (e) {
              showUserErrorAlert(t, e, 'provision');
            } finally {
              setBusy(false);
            }
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { flex: 1, paddingTop: spacing.md },
});
