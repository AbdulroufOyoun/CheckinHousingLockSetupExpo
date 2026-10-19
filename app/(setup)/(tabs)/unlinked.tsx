import { router } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { fetchTenantLocks } from '@/src/api/lockSetupClient';
import { colors } from '@/src/theme/colors';

export default function UnlinkedTab() {
  const { t } = useTranslation();
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['unlinked-locks'],
    queryFn: () => fetchTenantLocks('unlinked', true),
  });

  const locks = data?.locks ?? [];

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <FlatList
      data={locks}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={colors.accent} />
      }
      ListEmptyComponent={<Text style={styles.empty}>{t('emptyUnlinked')}</Text>}
      renderItem={({ item }) => (
        <Pressable
          style={styles.row}
          onPress={() =>
            router.push({
              pathname: '/(setup)/locks/[lockDbId]',
              params: {
                lockDbId: String(item.id),
                title: item.lockAlias || item.lockName,
                lockCloudId: item.lockId,
                lockMac: item.lockMac,
              },
            })
          }
        >
          <Text style={styles.title}>{item.lockAlias || item.lockName}</Text>
          <Text style={styles.meta}>{item.lockMac || item.lockId}</Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  list: { padding: 16, paddingBottom: 40 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 48, fontSize: 16 },
  row: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { color: colors.text, fontWeight: '600', fontSize: 16 },
  meta: { color: colors.muted, marginTop: 4, fontSize: 13 },
});
