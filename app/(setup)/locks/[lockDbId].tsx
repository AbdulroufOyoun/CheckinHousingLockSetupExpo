import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { fetchLockDetail, fetchLockUnlockHistory, unlinkLock } from '@/src/api/lockSetupClient';
import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { useInvalidateBootstrap } from '@/src/hooks/useBootstrap';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { showUserErrorAlert } from '@/src/api/formatApiError';
import { unlockWithLock } from '@/src/services/unlockService';
import type { PropertyType } from '@/src/types/models';
import { colors } from '@/src/theme/colors';
import { appStyles } from '@/src/theme/styles';
import { radii, spacing } from '@/src/theme/tokens';
import type { CloudLock } from '@/src/types/models';
import { formatDateTime } from '@/src/utils/formatDateTime';

const PER_PAGE = 15;

export default function LockDetailScreen() {
  const { t, i18n } = useTranslation();
  const params = useLocalSearchParams<{
    lockDbId: string;
    title?: string;
    lockCloudId?: string;
    lockMac?: string;
    propertyType?: string;
    propertyId?: string;
  }>();
  const lockDbId = Number(params.lockDbId);
  const propertyType = params.propertyType as PropertyType | undefined;
  const propertyId = params.propertyId ? Number(params.propertyId) : undefined;
  const { listContentStyle } = useResponsiveLayout();
  const invalidate = useInvalidateBootstrap();
  const [unlinkBusy, setUnlinkBusy] = useState(false);

  const { data: lockDetail } = useQuery({
    queryKey: ['lock-detail', lockDbId],
    queryFn: () => fetchLockDetail(lockDbId),
    enabled: lockDbId > 0,
  });

  const apiLock: CloudLock = {
    dbId: lockDbId,
    lockId: lockDetail?.lockId ?? params.lockCloudId ?? '',
    lockMac: lockDetail?.lockMac ?? params.lockMac ?? '',
    lockAlias: lockDetail?.lockAlias ?? params.title ?? '',
    lockName: lockDetail?.lockName ?? params.title ?? '',
    lockData: '',
  };

  const historyQuery = useInfiniteQuery({
    queryKey: ['lock-unlock-history', lockDbId],
    queryFn: ({ pageParam }) => fetchLockUnlockHistory(lockDbId, pageParam, PER_PAGE),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.current_page < last.last_page ? last.current_page + 1 : undefined,
    enabled: lockDbId > 0,
  });

  const historyRows = useMemo(
    () => historyQuery.data?.pages.flatMap((p) => p.data ?? []) ?? [],
    [historyQuery.data],
  );

  const canUnlinkFromProperty =
    propertyType && propertyId && propertyId > 0 && lockDbId > 0;

  const onUnlink = () => {
    if (!canUnlinkFromProperty) return;
    Alert.alert(t('unlinkLock'), lockDetail?.lockAlias ?? params.title ?? '', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'OK',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setUnlinkBusy(true);
            try {
              await unlinkLock(propertyType!, propertyId!, lockDbId);
              await invalidate();
              Alert.alert(t('done'), t('unlinkLock'));
              router.back();
            } catch (e) {
              showUserErrorAlert(t, e, 'link');
            } finally {
              setUnlinkBusy(false);
            }
          })();
        },
      },
    ]);
  };

  const onUnlock = async () => {
    try {
      await unlockWithLock(apiLock);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t('done'), t('unlockSuccess'));
    } catch (e) {
      showUserErrorAlert(t, e, 'unlock');
    }
  };

  const header = (
    <View style={styles.header}>
      <View style={[appStyles.card, styles.hero]}>
        <Text style={styles.alias}>{lockDetail?.lockAlias ?? params.title ?? '—'}</Text>
        <Text style={styles.mac}>{lockDetail?.lockMac ?? params.lockMac ?? '—'}</Text>
        {lockDetail?.electricQuantity != null && lockDetail.electricQuantity >= 0 ? (
          <Text style={styles.battery}>{t('detailBattery', { level: lockDetail.electricQuantity })}</Text>
        ) : null}
        {lockDetail?.added_to_system_at ? (
          <Text style={styles.fact}>
            {t('detailAddedToSystem')}: {formatDateTime(lockDetail.added_to_system_at, i18n.language)}
          </Text>
        ) : null}
        <Button label={t('unlock')} onPress={() => void onUnlock()} />
        {canUnlinkFromProperty ? (
          <Button label={t('unlinkLock')} variant="danger" loading={unlinkBusy} onPress={onUnlink} />
        ) : null}
      </View>

      {(lockDetail?.current_links?.length ?? 0) > 0 ? (
        <View style={styles.section}>
          <Text style={appStyles.sectionTitle}>{t('detailCurrentLinks')}</Text>
          {lockDetail!.current_links!.map((link) => (
            <View key={`${link.type}-${link.id}`} style={styles.linkRow}>
              <Ionicons name="link-outline" size={16} color={colors.accent} />
              <View style={styles.linkBody}>
                <Text style={styles.linkTitle}>
                  {link.type} · {link.label}
                </Text>
                {link.linked_at ? (
                  <Text style={styles.linkMeta}>{formatDateTime(link.linked_at, i18n.language)}</Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {(lockDetail?.link_timeline?.length ?? 0) > 0 ? (
        <View style={styles.section}>
          <Text style={appStyles.sectionTitle}>{t('detailLinkTimeline')}</Text>
          {lockDetail!.link_timeline!.slice(0, 15).map((ev) => (
            <View key={ev.id} style={styles.linkRow}>
              <Ionicons
                name={ev.action === 'linked' ? 'add-circle-outline' : 'remove-circle-outline'}
                size={16}
                color={ev.action === 'linked' ? colors.success : colors.warning}
              />
              <View style={styles.linkBody}>
                <Text style={styles.linkTitle}>
                  {ev.property_label} ({ev.property_type})
                </Text>
                <Text style={styles.linkMeta}>{formatDateTime(ev.occurred_at, i18n.language)}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <Text style={[appStyles.sectionTitle, styles.historyTitle]}>{t('history')}</Text>
    </View>
  );

  return (
    <Screen edges={['bottom', 'left', 'right']} style={styles.pad}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: lockDetail?.lockAlias ?? params.title ?? t('detailOpenLock'),
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }}
      />
      <FlatList
        data={historyRows}
        keyExtractor={(item, idx) => String(item.id ?? idx)}
        ListHeaderComponent={header}
        contentContainerStyle={listContentStyle}
        ListEmptyComponent={
          historyQuery.isLoading ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <Text style={styles.empty}>{t('detailNoUnlocks')}</Text>
          )
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rowTitle}>{item.user_name ?? '—'}</Text>
            <Text style={styles.rowMeta}>
              {formatDateTime(item.created_at ?? item.unlocked_at, i18n.language)}
            </Text>
          </View>
        )}
        onEndReached={() => {
          if (historyQuery.hasNextPage && !historyQuery.isFetchingNextPage) {
            void historyQuery.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.35}
        ListFooterComponent={
          historyQuery.isFetchingNextPage ? (
            <ActivityIndicator color={colors.accent} style={{ paddingVertical: spacing.md }} />
          ) : undefined
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { flex: 1 },
  header: { gap: spacing.md, paddingTop: spacing.md, paddingBottom: 0 },
  hero: { gap: spacing.sm },
  alias: { color: colors.text, fontSize: 20, fontWeight: '800' },
  mac: {
    color: colors.textSecondary,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  battery: { color: colors.textSecondary, fontSize: 13 },
  fact: { color: colors.muted, fontSize: 12 },
  section: { gap: spacing.sm },
  linkRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  linkBody: { flex: 1 },
  linkTitle: { color: colors.text, fontWeight: '600', fontSize: 14 },
  linkMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  historyTitle: { marginTop: spacing.xs },
  empty: { color: colors.muted, padding: spacing.lg, textAlign: 'center' },
  row: {
    backgroundColor: colors.card,
    borderRadius: radii.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  rowTitle: { color: colors.text, fontWeight: '600' },
  rowMeta: { color: colors.muted, fontSize: 12, marginTop: spacing.xs },
});
