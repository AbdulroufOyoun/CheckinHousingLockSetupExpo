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

import { fetchTenants } from '@/src/api/lockSetupClient';
import { Screen } from '@/src/components/ui/Screen';
import { TextField } from '@/src/components/ui/TextField';
import { useSession } from '@/src/store/session';
import { colors } from '@/src/theme/colors';
import { useQuery } from '@tanstack/react-query';

export default function TenantsScreen() {
  const { t } = useTranslation();
  const { selectTenant } = useSession();
  const [query, setQuery] = useState('');
  const { data, isLoading, error } = useQuery({
    queryKey: ['tenants'],
    queryFn: fetchTenants,
  });

  const tenants = useMemo(() => {
    const list = data?.tenants ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (tenant) =>
        tenant.name?.toLowerCase().includes(q) ||
        tenant.domain?.toLowerCase().includes(q) ||
        tenant.id.toLowerCase().includes(q),
    );
  }, [data, query]);

  return (
    <Screen style={styles.pad}>
      <Text style={styles.title}>{t('selectTenant')}</Text>
      <TextField
        label={t('searchTenant')}
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
      />
      {isLoading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />
      ) : error ? (
        <Text style={styles.error}>{error instanceof Error ? error.message : t('errorGeneric')}</Text>
      ) : (
        <FlatList
          data={tenants}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 32 }}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
              onPress={async () => {
                await selectTenant(item.id, item.domain);
                router.replace('/(setup)/(tabs)/property');
              }}
            >
              <Text style={styles.name}>{item.domain ?? item.name ?? item.id}</Text>
              <Text style={styles.meta}>ID {item.id}</Text>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: 20, paddingTop: 16 },
  title: { color: colors.text, fontSize: 24, fontWeight: '700', marginBottom: 16 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  name: { color: colors.text, fontSize: 17, fontWeight: '600' },
  meta: { color: colors.muted, marginTop: 4, fontSize: 13 },
  error: { color: colors.danger, marginTop: 12 },
});
