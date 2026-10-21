import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';

import { showUserErrorAlert } from '@/src/api/formatApiError';
import { LockPayloadConfirmModal } from '@/src/components/LockPayloadConfirmModal';
import { ScanLocksPanel } from '@/src/components/ScanLocksPanel';
import { Screen } from '@/src/components/ui/Screen';
import { useInvalidateBootstrap } from '@/src/hooks/useBootstrap';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import {
  buildRegisterPayload,
  registerLocalOnly,
  type RegisterLockPayload,
} from '@/src/services/provisionService';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/tokens';

export default function QuickProvisionScreen() {
  const { t } = useTranslation();
  const { pageContentStyle } = useResponsiveLayout();
  const invalidate = useInvalidateBootstrap();
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<RegisterLockPayload | null>(null);

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
              const payload = await buildRegisterPayload(alias, lockData, device);
              setPending(payload);
            } catch (e) {
              showUserErrorAlert(t, e, 'provision');
            } finally {
              setBusy(false);
            }
          }}
        />
      </View>
      <LockPayloadConfirmModal
        visible={pending !== null}
        title={t('registerPayloadTitle')}
        payload={pending ? { api: 'POST /api/lock-setup/tenants/{tenant}/locks', body: pending } : {}}
        loading={busy}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (!pending) return;
          void (async () => {
            setBusy(true);
            try {
              await registerLocalOnly(pending);
              setPending(null);
              await invalidate();
              Alert.alert(t('done'), t('linkSuccess'));
            } catch (e) {
              showUserErrorAlert(t, e, 'provision');
            } finally {
              setBusy(false);
            }
          })();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { flex: 1, paddingTop: spacing.md },
});
