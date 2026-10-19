import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { fetchLockUnlockHistory } from '@/src/api/lockSetupClient';
import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { unlockWithLock } from '@/src/services/unlockService';
import { colors } from '@/src/theme/colors';
import type { CloudLock } from '@/src/types/models';

const PER_PAGE = 20;

export default function LockDetailScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    lockDbId: string;
    title?: string;
    lockCloudId?: string;
    lockMac?: string;
  }>();
  const lockDbId = Number(params.lockDbId);
  const [page, setPage] = useState(1);

  const apiLock: CloudLock = {
    dbId: lockDbId,
    lockId: params.lockCloudId ?? '',
    lockMac: params.lockMac ?? '',
    lockAlias: params.title ?? '',
    lockName: params.title ?? '',
    lockData: '',
  };

  const { data, isLoading } = useQuery({
    queryKey: ['lock-history', lockDbId, page],
    queryFn: () => fetchLockUnlockHistory(lockDbId, page, PER_PAGE),
    enabled: lockDbId > 0,
  });

  const onUnlock = async () => {
    try {
      await unlockWithLock(apiLock);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t('done'), t('unlockSuccess'));
    } catch (e) {
      Alert.alert(t('errorGeneric'), e instanceof Error ? e.message : t('unlockFailed'));
    }
  };

  return (
    <Screen style={styles.pad}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: params.title ?? t('history'),
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }}
      />
      <Text style={styles.sub}>{params.lockMac}</Text>
      <Button label={t('unlock')} onPress={() => void onUnlock()} />
      <Text style={styles.section}>{t('history')}</Text>
      {isLoading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 16 }} />
      ) : (
        <>
          <FlatList
            data={data?.data ?? []}
            keyExtractor={(item, idx) => String(item.id ?? idx)}
            ListEmptyComponent={<Text style={styles.empty}>—</Text>}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <Text style={styles.rowTitle}>{item.user_name ?? '—'}</Text>
                <Text style={styles.rowMeta}>{item.created_at ?? ''}</Text>
              </View>
            )}
          />
          <View style={styles.pager}>
            <Button
              label={t('prev')}
              variant="ghost"
              disabled={page <= 1}
              onPress={() => setPage((p) => Math.max(1, p - 1))}
            />
            <Text style={styles.pageInfo}>
              {page} / {data?.last_page ?? 1}
            </Text>
            <Button
              label={t('next')}
              variant="ghost"
              disabled={page >= (data?.last_page ?? 1)}
              onPress={() => setPage((p) => p + 1)}
            />
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 16, flex: 1 },
  sub: { color: colors.muted, marginBottom: 12 },
  section: { color: colors.text, fontWeight: '700', marginTop: 20, marginBottom: 8, fontSize: 16 },
  empty: { color: colors.muted, padding: 16 },
  row: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowTitle: { color: colors.text, fontWeight: '600' },
  rowMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  pageInfo: { color: colors.muted },
});
