import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';

import { ScanLocksPanel } from '@/src/components/ScanLocksPanel';
import { Screen } from '@/src/components/ui/Screen';
import { useInvalidateBootstrap } from '@/src/hooks/useBootstrap';
import { syncCloudOnly } from '@/src/services/provisionService';
import { colors } from '@/src/theme/colors';

export default function QuickProvisionScreen() {
  const { t } = useTranslation();
  const invalidate = useInvalidateBootstrap();
  const [busy, setBusy] = useState(false);

  return (
    <Screen style={styles.pad}>
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
          onInitialized={async (lockData) => {
            if (busy) return;
            setBusy(true);
            try {
              const alias = `Lock_${Date.now()}`;
              await syncCloudOnly(alias, lockData);
              await invalidate();
              Alert.alert(t('done'), t('linkSuccess'));
            } catch (e) {
              Alert.alert(t('errorGeneric'), e instanceof Error ? e.message : String(e));
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
  pad: { padding: 16 },
});
