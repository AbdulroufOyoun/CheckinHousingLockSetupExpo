import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { showUserErrorAlert } from '@/src/api/formatApiError';
import { fetchSaltoDoors } from '@/src/api/lockSetupClient';
import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { useInvalidateBootstrap } from '@/src/hooks/useBootstrap';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { registerSaltoDoor } from '@/src/services/provisionService';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/tokens';

export default function SaltoLinkScreen() {
  const { t } = useTranslation();
  const { pageContentStyle } = useResponsiveLayout();
  const invalidate = useInvalidateBootstrap();
  const [installationId, setInstallationId] = useState('');
  const [doorId, setDoorId] = useState('');
  const [alias, setAlias] = useState('');
  const [busy, setBusy] = useState(false);

  const doorsQuery = useQuery({
    queryKey: ['salto-doors', installationId],
    queryFn: () => fetchSaltoDoors(installationId || undefined),
    enabled: false,
  });

  const onLoadDoors = () => {
    void doorsQuery.refetch();
  };

  const onSubmit = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const lockAlias = alias.trim() || `Salto_${doorId.trim()}`;
      await registerSaltoDoor({
        vendor: 'salto',
        lock_alias: lockAlias,
        lock_name: lockAlias,
        salto_installation_id: installationId.trim(),
        salto_door_id: doorId.trim(),
      });
      await invalidate();
      Alert.alert(t('done'), t('linkSuccess'));
    } catch (e) {
      showUserErrorAlert(t, e, 'provision');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={['bottom', 'left', 'right']} style={[styles.pad, pageContentStyle]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('linkSaltoDoor'),
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }}
      />
      <View style={styles.form}>
        <Text style={styles.label}>{t('saltoInstallationId')}</Text>
        <TextInput
          style={styles.input}
          value={installationId}
          onChangeText={setInstallationId}
          autoCapitalize="none"
          placeholder="Installation ID"
        />
        <Text style={styles.label}>{t('saltoDoorId')}</Text>
        <TextInput
          style={styles.input}
          value={doorId}
          onChangeText={setDoorId}
          autoCapitalize="none"
          placeholder="Door ID"
        />
        <Text style={styles.label}>{t('lockAlias')}</Text>
        <TextInput style={styles.input} value={alias} onChangeText={setAlias} placeholder={t('lockAlias')} />
        <Button label={t('loadSaltoDoors')} onPress={onLoadDoors} loading={doorsQuery.isFetching} />
        {(doorsQuery.data?.doors?.length ?? 0) > 0 ? (
          <View style={styles.doorList}>
            {doorsQuery.data!.doors.map((d) => (
              <Text
                key={d.id}
                style={styles.doorRow}
                onPress={() => {
                  setDoorId(d.id);
                  if (d.installation_id) setInstallationId(d.installation_id);
                }}
              >
                {d.name} ({d.id})
              </Text>
            ))}
          </View>
        ) : null}
        <Button label={t('linkSaltoDoor')} loading={busy} onPress={() => void onSubmit()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { flex: 1, paddingTop: spacing.md, paddingHorizontal: spacing.md },
  form: { gap: spacing.sm },
  label: { color: colors.textMuted, fontSize: 13 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.sm,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  doorList: { marginVertical: spacing.sm, gap: 4 },
  doorRow: { color: colors.accent, fontSize: 14 },
});
