import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { formatApiErrorMessage } from '@/src/api/formatApiError';
import { fetchTenants } from '@/src/api/lockSetupClient';
import { Screen } from '@/src/components/ui/Screen';
import { TextField } from '@/src/components/ui/TextField';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { useSession } from '@/src/store/session';
import { colors } from '@/src/theme/colors';
import { elevation, radii, spacing, typography } from '@/src/theme/tokens';
import { useQuery } from '@tanstack/react-query';

export default function TenantsScreen() {
  const { t } = useTranslation();
  const { pageContentStyle } = useResponsiveLayout();
  const { selectTenant, token } = useSession();
  const [query, setQuery] = useState('');
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['tenants'],
    queryFn: fetchTenants,
    enabled: Boolean(token),
    retry: 1,
  });

  const tenants = useMemo(() => {
    const list = data?.tenants ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (tenant) =>
        tenant.name?.toLowerCase().includes(q) ||
        tenant.domain?.toLowerCase().includes(q) ||
        String(tenant.id).toLowerCase().includes(q),
    );
  }, [data, query]);

  return (
    <Screen edges={['bottom', 'left', 'right']} style={[styles.pad, pageContentStyle]}>
      <Text style={styles.title}>{t('selectTenant')}</Text>
      <TextField
        label={t('searchTenant')}
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
      />
      {isLoading || isRefetching ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />
      ) : error ? (
        <View style={{ gap: 8 }}>
          <Text style={styles.error}>{formatApiErrorMessage(error, t)}</Text>
          <Pressable onPress={() => void refetch()}>
            <Text style={styles.retry}>{t('common.refresh')}</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={tenants}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: spacing.xxl }}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {query.trim() ? t('emptyTenantSearch') : t('emptyTenants')}
            </Text>
          }
          renderItem={({ item }) => {
            const primary = item.domain ?? item.name ?? item.id;
            const secondary =
              item.name && item.domain && item.name !== item.domain ? item.name : `ID ${item.id}`;
            return (
              <Pressable
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                onPress={async () => {
                  void Haptics.selectionAsync();
                  await selectTenant(item.id, item.domain);
                  router.replace('/(setup)/(tabs)/property');
                }}
              >
                <View style={styles.iconWrap}>
                  <Ionicons name="business-outline" size={22} color={colors.accent} />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.name} numberOfLines={1}>
                    {primary}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {secondary}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.muted} />
              </Pressable>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingTop: spacing.lg, flex: 1 },
  title: { color: colors.text, ...typography.title, marginBottom: spacing.lg },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...elevation.card,
  },
  cardPressed: { opacity: 0.92 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radii.sm,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, minWidth: 0 },
  name: { color: colors.text, fontSize: 17, fontWeight: '700' },
  meta: { color: colors.textSecondary, marginTop: 3, fontSize: 13 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: spacing.xxl },
  error: { color: colors.danger, marginTop: spacing.md },
  retry: { color: colors.accent, fontWeight: '600' },
});
