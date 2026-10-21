import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { showUserErrorAlert } from '@/src/api/formatApiError';
import { fetchPropertyDetail, fetchPropertyUnlockHistory } from '@/src/api/lockSetupClient';
import { LinkExistingSheet } from '@/src/components/LinkExistingSheet';
import { ScanLocksPanel } from '@/src/components/ScanLocksPanel';
import { Button } from '@/src/components/ui/Button';
import { useBootstrap, useInvalidateBootstrap } from '@/src/hooks/useBootstrap';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { buildRegisterPayload, provisionAndLink } from '@/src/services/provisionService';
import { useSession } from '@/src/store/session';
import { colors } from '@/src/theme/colors';
import { appStyles } from '@/src/theme/styles';
import { elevation, radii, spacing } from '@/src/theme/tokens';
import type { PropertyType } from '@/src/types/models';
import type { SiteDetailPropertyType } from '@/src/constants/siteDetailTypes';
import { findSiteUnit } from '@/src/utils/bootstrapLookup';
import { formatDateTime } from '@/src/utils/formatDateTime';

const HISTORY_PAGE = 15;

const TYPE_ICONS: Record<
  SiteDetailPropertyType,
  keyof typeof Ionicons.glyphMap
> = {
  building: 'business-outline',
  gate: 'enter-outline',
  elevator: 'arrow-up-outline',
  parking: 'car-outline',
};

type Props = {
  propertyType: SiteDetailPropertyType;
  unitId: number;
};

export function SiteUnitDetailScreenContent({ propertyType, unitId }: Props) {
  const { t, i18n } = useTranslation();
  const { listContentStyle } = useResponsiveLayout();
  const { tenantId } = useSession();
  const { data: bootstrap, refetch: refetchBootstrap } = useBootstrap(tenantId);
  const invalidate = useInvalidateBootstrap();
  const [showScan, setShowScan] = useState(false);
  const [linkSheet, setLinkSheet] = useState(false);
  const [busy, setBusy] = useState(false);

  const unit = useMemo(
    () => findSiteUnit(bootstrap, propertyType, unitId),
    [bootstrap, propertyType, unitId],
  );

  const { data: detail, refetch: refetchDetail, isRefetching } = useQuery({
    queryKey: ['property-detail', tenantId, propertyType, unitId],
    queryFn: () => fetchPropertyDetail(propertyType, unitId),
    enabled: Boolean(tenantId),
  });

  const primaryLock = detail?.locks?.[0];
  const hasLock = Boolean(
    primaryLock?.id ?? unit?.has_lock ?? (unit?.locks?.length ?? 0) > 0,
  );
  const lockDbId = primaryLock?.id ?? unit?.locks?.[0]?.id;

  const title = unit?.name ?? detail?.property?.name ?? detail?.property?.label ?? String(unitId);
  const context = detail?.property;
  const sectionLabel = t(
    propertyType === 'building'
      ? 'sectionBuildings'
      : propertyType === 'gate'
        ? 'sectionGates'
        : propertyType === 'elevator'
          ? 'sectionElevators'
          : 'sectionParkings',
  );

  const historyQuery = useInfiniteQuery({
    queryKey: ['property-unlock-history', tenantId, propertyType, unitId],
    queryFn: ({ pageParam }) =>
      fetchPropertyUnlockHistory(propertyType, unitId, pageParam, HISTORY_PAGE),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.current_page < last.last_page ? last.current_page + 1 : undefined,
    enabled: Boolean(tenantId),
  });

  const historyRows = useMemo(
    () => historyQuery.data?.pages.flatMap((p) => p.data ?? []) ?? [],
    [historyQuery.data],
  );

  const goToLockDetail = () => {
    if (!lockDbId) return;
    router.push({
      pathname: '/(setup)/locks/[lockDbId]',
      params: {
        lockDbId: String(lockDbId),
        title: primaryLock?.lockAlias ?? '',
        lockCloudId: primaryLock?.lockId ?? '',
        lockMac: primaryLock?.lockMac ?? '',
        propertyType,
        propertyId: String(unitId),
      },
    });
  };

  const blockIfHasLock = () => {
    Alert.alert(t('unitHasLockTitle'), t('unitHasLockMessage'), [
      { text: t('done'), style: 'cancel' },
      { text: t('detailOpenLock'), onPress: goToLockDetail },
    ]);
  };

  const tryAddLock = () => {
    if (hasLock) {
      blockIfHasLock();
      return;
    }
    setShowScan(true);
  };

  const tryLinkExisting = () => {
    if (hasLock) {
      blockIfHasLock();
      return;
    }
    setLinkSheet(true);
  };

  const lockAlias = () => `${title.replace(/\s+/g, '')}Lock`;

  const onProvision = async (
    lockData: string,
    device: { lockMac: string; lockName: string; electricQuantity: number },
  ) => {
    if (hasLock) return;
    setBusy(true);
    try {
      const payload = buildRegisterPayload(lockAlias(), lockData, device);
      await provisionAndLink(propertyType as PropertyType, unitId, payload);
      await invalidate();
      await refetchBootstrap();
      await refetchDetail();
      setShowScan(false);
      Alert.alert(t('done'), t('linkSuccess'));
    } catch (e) {
      showUserErrorAlert(t, e, 'provision');
    } finally {
      setBusy(false);
    }
  };

  const header = (
    <View style={styles.header}>
      <View style={[styles.hero, hasLock ? styles.heroLinked : styles.heroOpen]}>
        <View style={styles.heroIconRow}>
          <View style={styles.heroIcon}>
            <Ionicons name={TYPE_ICONS[propertyType]} size={24} color={colors.accent} />
          </View>
          <Text style={styles.kicker}>{sectionLabel}</Text>
        </View>
        <Text style={styles.heroTitle}>{title}</Text>
        {unit?.subtitle ? <Text style={styles.subtitle}>{unit.subtitle}</Text> : null}
        {context?.building_name && propertyType !== 'building' ? (
          <MetaRow icon="business-outline" label={t('detailBuilding')} value={context.building_name} />
        ) : null}
        {unit?.direction ? (
          <MetaRow icon="compass-outline" label={t('siteDetailDirection')} value={unit.direction} />
        ) : null}
      </View>

      {hasLock ? (
        <View style={styles.lockBanner}>
          <Ionicons name="lock-closed" size={22} color={colors.success} />
          <View style={styles.lockBannerText}>
            <Text style={styles.lockBannerTitle}>{t('siteUnitLockAttached')}</Text>
            <Text style={styles.lockBannerSub} numberOfLines={1}>
              {primaryLock?.lockAlias ?? primaryLock?.lockName ?? t('propertyStatWithLock')}
            </Text>
          </View>
          <Button label={t('detailOpenLock')} variant="ghost" onPress={goToLockDetail} />
        </View>
      ) : (
        <View style={styles.actions}>
          <Button label={t('programLock')} loading={busy} onPress={tryAddLock} />
          <Button label={t('linkExisting')} variant="ghost" onPress={tryLinkExisting} />
        </View>
      )}

      {showScan && !hasLock ? (
        <View style={styles.scanBlock}>
          <ScanLocksPanel autoStart onInitialized={onProvision} />
        </View>
      ) : null}

      <Text style={[appStyles.sectionTitle, styles.historyHeading]}>{t('siteUnitUnlockHistory')}</Text>
    </View>
  );

  return (
    <>
      <FlatList
        data={historyRows}
        keyExtractor={(item, idx) => String(item.id ?? idx)}
        contentContainerStyle={listContentStyle}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching || historyQuery.isRefetching}
            onRefresh={() => {
              void refetchDetail();
              void historyQuery.refetch();
              void refetchBootstrap();
            }}
            tintColor={colors.accent}
          />
        }
        ListHeaderComponent={header}
        ListEmptyComponent={
          historyQuery.isLoading ? (
            <ActivityIndicator color={colors.accent} style={{ marginVertical: spacing.lg }} />
          ) : (
            <Text style={styles.emptyHistory}>{t('detailNoUnlocks')}</Text>
          )
        }
        renderItem={({ item }) => (
          <View style={styles.historyRow}>
            <Ionicons name="key-outline" size={18} color={colors.accent} />
            <View style={styles.historyBody}>
              <Text style={styles.historyUser}>{item.user_name || '—'}</Text>
              <Text style={styles.historyMeta}>
                {formatDateTime(item.created_at ?? item.unlocked_at, i18n.language)}
              </Text>
            </View>
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

      <LinkExistingSheet
        visible={linkSheet && !hasLock}
        propertyType={propertyType}
        propertyId={unitId}
        onClose={() => setLinkSheet(false)}
        onLinked={() => {
          void invalidate();
          void refetchBootstrap();
          void refetchDetail();
          setLinkSheet(false);
          Alert.alert(t('done'), t('linkSuccess'));
        }}
      />
    </>
  );
}

function MetaRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metaRow}>
      <Ionicons name={icon} size={16} color={colors.muted} />
      <View style={styles.metaText}>
        <Text style={styles.metaLabel}>{label}</Text>
        <Text style={styles.metaValue} numberOfLines={2}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.md, paddingTop: spacing.sm },
  hero: {
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    gap: spacing.sm,
    ...elevation.card,
  },
  heroLinked: { borderColor: colors.success, backgroundColor: colors.cardElevated },
  heroOpen: { borderColor: colors.borderSubtle, backgroundColor: colors.card },
  heroIconRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.sm,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: { color: colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  heroTitle: { color: colors.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: colors.textSecondary, fontSize: 15, lineHeight: 21 },
  metaRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginTop: spacing.xs },
  metaText: { flex: 1 },
  metaLabel: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  metaValue: { color: colors.text, fontSize: 15, fontWeight: '600', marginTop: 2 },
  lockBanner: {
    ...appStyles.card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  lockBannerText: { flex: 1, minWidth: 0 },
  lockBannerTitle: { color: colors.text, fontWeight: '700', fontSize: 15 },
  lockBannerSub: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  actions: { gap: spacing.sm },
  scanBlock: { marginTop: spacing.xs },
  historyHeading: { marginTop: spacing.sm },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  historyBody: { flex: 1 },
  historyUser: { color: colors.text, fontWeight: '600' },
  historyMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  emptyHistory: { color: colors.muted, textAlign: 'center', paddingVertical: spacing.lg },
});
