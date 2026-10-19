import { router, Stack } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { getApiBase } from '@/src/config/env';
import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { useSession } from '@/src/store/session';
import { colors } from '@/src/theme/colors';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const { tenantDomain, tenantId, clearTenant, signOut, setLanguage } = useSession();
  const lang = i18n.language.startsWith('ar') ? 'ar' : 'en';

  return (
    <Screen style={styles.pad}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('settings'),
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }}
      />
      <View style={styles.card}>
        <Text style={styles.label}>API</Text>
        <Text style={styles.value}>{getApiBase()}</Text>
        <Text style={[styles.label, { marginTop: 12 }]}>Tenant</Text>
        <Text style={styles.value}>{tenantDomain ?? tenantId ?? '—'}</Text>
      </View>

      <Text style={styles.section}>{t('language')}</Text>
      <View style={styles.row}>
        <Button
          label={t('english')}
          variant={lang === 'en' ? 'primary' : 'ghost'}
          onPress={() => void setLanguage('en')}
        />
        <Button
          label={t('arabic')}
          variant={lang === 'ar' ? 'primary' : 'ghost'}
          onPress={() => void setLanguage('ar')}
        />
      </View>

      <View style={{ marginTop: 24, gap: 10 }}>
        <Button
          label={t('changeTenant')}
          variant="ghost"
          onPress={async () => {
            await clearTenant();
            router.replace('/(setup)/tenants');
          }}
        />
        <Button label={t('logout')} variant="danger" onPress={() => void signOut()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 16 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  value: { color: colors.text, fontSize: 15, marginTop: 4 },
  section: { color: colors.text, fontWeight: '700', marginTop: 24, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 10 },
});
