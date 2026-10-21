import { router, Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { getApiBase } from '@/src/config/env';
import { Button } from '@/src/components/ui/Button';
import { TextField } from '@/src/components/ui/TextField';
import { Screen } from '@/src/components/ui/Screen';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { useSession } from '@/src/store/session';
import { colors } from '@/src/theme/colors';
import { appStyles } from '@/src/theme/styles';
import { spacing } from '@/src/theme/tokens';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const { pageContentStyle } = useResponsiveLayout();
  const { tenantDomain, tenantId, clearTenant, signOut, setLanguage, setApiBase } = useSession();
  const lang = i18n.language.startsWith('ar') ? 'ar' : 'en';
  const [apiUrl, setApiUrl] = useState(getApiBase());
  const [apiSaved, setApiSaved] = useState(false);

  useEffect(() => {
    setApiUrl(getApiBase());
  }, []);

  return (
    <Screen edges={['bottom', 'left', 'right']} style={[styles.pad, pageContentStyle]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('settings'),
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }}
      />
      <View style={[appStyles.card, styles.card]}>
        <TextField
          label={t('apiBaseLabel')}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          value={apiUrl}
          onChangeText={(v) => {
            setApiUrl(v);
            setApiSaved(false);
          }}
        />
        <Text style={styles.apiHint}>{t('apiBaseHint')}</Text>
        <Button
          label={apiSaved ? t('apiBaseSaved') : t('apiBaseSave')}
          variant="ghost"
          onPress={async () => {
            await setApiBase(apiUrl.trim());
            setApiSaved(true);
          }}
        />
        <Text style={styles.label}>{t('selectTenant')}</Text>
        <Text style={styles.value}>{tenantDomain ?? tenantId ?? '—'}</Text>
      </View>

      <Text style={appStyles.sectionTitle}>{t('language')}</Text>
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
          onPress={() => void clearTenant()}
        />
        <Button label={t('logout')} variant="danger" onPress={() => void signOut()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingVertical: spacing.lg, flex: 1 },
  card: { gap: spacing.xs },
  label: { color: colors.muted, fontSize: 12, fontWeight: '600', marginTop: spacing.sm },
  value: { color: colors.text, fontSize: 15, marginTop: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.sm },
  apiHint: { color: colors.textSecondary, fontSize: 11, marginTop: spacing.xs, marginBottom: spacing.sm, lineHeight: 16 },
});
