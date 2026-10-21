import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { fetchPropertyDetail, fetchPropertyUnlockHistory, unlinkLock } from '@/src/api/lockSetupClient';
import { LinkExistingSheet } from '@/src/components/LinkExistingSheet';
import { ScanLocksPanel } from '@/src/components/ScanLocksPanel';
import { Button } from '@/src/components/ui/Button';
import { useBootstrap, useInvalidateBootstrap } from '@/src/hooks/useBootstrap';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { showUserErrorAlert } from '@/src/api/formatApiError';
import { LockPayloadConfirmModal } from '@/src/components/LockPayloadConfirmModal';
import {
  buildRegisterPayload,
  provisionAndLink,
  type RegisterLockPayload,
} from '@/src/services/provisionService';
import { unlockWithLock } from '@/src/services/unlockService';
import { useSession } from '@/src/store/session';
import { colors } from '@/src/theme/colors';
import { appStyles } from '@/src/theme/styles';
import { elevation, radii, spacing } from '@/src/theme/tokens';
import type { PropertyType } from '@/src/types/models';
import { cloudLockFromApiLock } from '@/src/utils/apiLockFromRecord';
import { facilityDisplayName } from '@/src/utils/lockMerge';
import { getPropertyEntity, siteUnitTitle } from '@/src/utils/bootstrapLookup';
import { formatDateTime } from '@/src/utils/formatDateTime';

const HISTORY_PAGE = 15;

type Props = {
  propertyType: PropertyType;
  propertyId: number;
};

export function PropertyDetailScreenContent({ propertyType, propertyId }: Props) {
  const { t, i18n } = useTranslation();
  const { listContentStyle } = useResponsiveLayout();
  const { tenantId } = useSession();
  const { data: bootstrap, refetch: refetchBootstrap } = useBootstrap(tenantId);
  const invalidate = useInvalidateBootstrap();
  const [showScan, setShowScan] = useState(false);
  const [linkSheet, setLinkSheet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pendingRegister, setPendingRegister] = useState<RegisterLockPayload | null>(null);

  const entity = useMemo(
    () => getPropertyEntity(bootstrap, propertyType, propertyId),
    [bootstrap, propertyType, propertyId],
  );

  const { data: detail, refetch: refetchDetail, isRefetching } = useQuery({
    queryKey: ['property-detail', tenantId, propertyType, propertyId],
    queryFn: () => fetchPropertyDetail(propertyType, propertyId),
    enabled: Boolean(tenantId),
  });

  const primaryLock = detail?.locks?.[0];
  const lock = entity && 'lock' in entity ? entity.lock : undefined;
  const hasLock = Boolean(
    primaryLock?.id ?? (entity && 'has_lock' in entity && entity.has_lock),
  );
  const lockDbId = primaryLock?.id ?? lock?.dbId ?? entity?.locks?.[0]?.id;

  const title = useMemo(() => {
    if (!entity) return detail?.property?.number ?? detail?.property?.name ?? '—';
    if (propertyType === 'facility') {
      return facilityDisplayName(entity as import('@/src/types/models').FacilityModel, i18n.language);
    }
    if (propertyType === 'room' || propertyType === 'suite') {
      return 'number' in entity ? String(entity.number) : String(propertyId);
    }
    return siteUnitTitle(entity as import('@/src/types/models').SiteUnitModel, propertyType);
  }, [entity, propertyType, propertyId, i18n.language, detail]);

  const historyQuery = useInfiniteQuery({
    queryKey: ['property-unlock-history', tenantId, propertyType, propertyId],
    queryFn: ({ pageParam }) =>
      fetchPropertyUnlockHistory(propertyType, propertyId, pageParam, HISTORY_PAGE),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.current_page < last.last_page ? last.current_page + 1 : undefined,
    enabled: Boolean(tenantId),
  });

  const historyRows = useMemo(
    () => historyQuery.data?.pages.flatMap((p) => p.data ?? []) ?? [],
    [historyQuery.data],
  );

  const aliasForProvision = () => {
    if (propertyType === 'room') return `${title}Lock`;
    if (propertyType === 'suite') return `Suite${title}Lock`;
    if (propertyType === 'floor') return `Floor${propertyId}Lock`;
    return `${title.replace(/\s+/g, '')}Lock`;
  };

  const onProvision = async (
    lockData: string,
    device: { lockMac: string; lockName: string; electricQuantity: number },
  ) => {
    if (hasLock) return;
    setBusy(true);
    try {
      const payload = buildRegisterPayload(aliasForProvision(), lockData, device);
      setPendingRegister(payload);
      setShowScan(false);
    } catch (e) {
      showUserErrorAlert(t, e, 'provision');
    } finally {
      setBusy(false);
    }
  };

  const confirmProvision = async () => {
    if (!pendingRegister) return;
    setBusy(true);
    try {
      await provisionAndLink(propertyType, propertyId, pendingRegister);
      setPendingRegister(null);
      await invalidate();
      await refetchBootstrap();
      await refetchDetail();
      Alert.alert(t('done'), t('linkSuccess'));
    } catch (e) {
      showUserErrorAlert(t, e, 'provision');
    } finally {
      setBusy(false);
    }
  };

  const onUnlink = () => {
    if (!lockDbId) return;
    Alert.alert(t('unlinkLock'), primaryLock?.lockAlias ?? lock?.lockAlias ?? '', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'OK',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setBusy(true);
            try {
              await unlinkLock(propertyType, propertyId, lockDbId);
              await invalidate();
              await refetchBootstrap();
              await refetchDetail();
              Alert.alert(t('done'), t('unlinkLock'));
            } catch (e) {
              showUserErrorAlert(t, e, 'link');
            } finally {
              setBusy(false);
            }
          })();
        },
      },
    ]);
  };

  const onUnlock = async () => {
    const cloudLock = lock ?? cloudLockFromApiLock(primaryLock);
    try {
      await unlockWithLock(cloudLock);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t('done'), t('unlockSuccess'));
    } catch (e) {
      showUserErrorAlert(t, e, 'unlock');
    }
  };

  const goToLockDetail = () => {
    if (!lockDbId) return;
    router.push({
      pathname: '/(setup)/locks/[lockDbId]',
      params: {
        lockDbId: String(lockDbId),
        title: primaryLock?.lockAlias ?? lock?.lockAlias ?? '',
        lockCloudId: primaryLock?.lockId ?? lock?.lockId ?? '',
        lockMac: primaryLock?.lockMac ?? lock?.lockMac ?? '',
        propertyType,
        propertyId: String(propertyId),
      },
    });
  };

  const tryAddLock = () => {
    if (hasLock) {
      Alert.alert(t('unitHasLockTitle'), t('unitHasLockMessage'), [
        { text: t('done'), style: 'cancel' },
        { text: t('detailOpenLock'), onPress: goToLockDetail },
      ]);
      return;
    }
    setShowScan(true);
  };

  const tryLinkExisting = () => {
    if (hasLock) {
      Alert.alert(t('unitHasLockTitle'), t('unitHasLockMessage'), [
        { text: t('done'), style: 'cancel' },
        { text: t('detailOpenLock'), onPress: goToLockDetail },
      ]);
      return;
    }
    setLinkSheet(true);
  };

  const context = detail?.property;
  const linkTimeline = detail?.link_timeline ?? [];

  const header = (
    <View style={styles.header}>
      <View style={[styles.hero, hasLock ? styles.heroLinked : styles.heroOpen]}>
        <View style={styles.heroTop}>
          <View style={[styles.statusPill, hasLock && styles.statusOn]}>
            <Ionicons
              name={hasLock ? 'lock-closed' : 'lock-open-outline'}
              size={14}
              color={hasLock ? colors.success : colors.muted}
            />
            <Text style={[styles.statusText, hasLock && styles.statusTextOn]}>
              {hasLock ? t('propertyStatWithLock') : t('noLock')}
            </Text>
          </View>
        </View>
        <Text style={styles.heroTitle}>{title}</Text>
        {propertyType === 'room' && context ? (
          <View style={styles.metaGrid}>
            <MetaItem icon="business-outline" label={t('detailBuilding')} value={context.building_name ?? '—'} />
            <MetaItem icon="layers-outline" label={t('detailFloor')} value={context.floor_label ?? '—'} />
            {context.suite_number ? (
              <MetaItem icon="grid-outline" label={t('detailSuite')} value={String(context.suite_number)} />
            ) : null}
            <MetaItem
              icon="people-outline"
              label={t('detailCapacity')}
              value={context.capacity != null ? String(context.capacity) : '—'}
            />
            {context.room_type?.name ? (
              <MetaItem icon="pricetag-outline" label={t('detailRoomType')} value={context.room_type.name} />
            ) : null}
          </View>
        ) : null}
      </View>

      {hasLock && primaryLock ? (
        <Pressable
          onPress={goToLockDetail}
          style={({ pressed }) => [styles.lockCard, pressed && { opacity: 0.94 }]}
        >
          <View style={styles.lockCardHead}>
            <Text style={appStyles.sectionTitle}>{t('detailLockSection')}</Text>
            <View style={styles.openLock}>
              <Text style={styles.openLockText}>{t('detailOpenLock')}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.accent} />
            </View>
          </View>
          <Text style={styles.lockAlias}>{primaryLock.lockAlias || primaryLock.lockName}</Text>
          <Text style={styles.lockMac}>{primaryLock.lockMac ?? '—'}</Text>
          <View style={styles.lockFacts}>
            {primaryLock.electricQuantity != null && primaryLock.electricQuantity >= 0 ? (
              <FactChip
                icon="battery-half-outline"
                label={`${primaryLock.electricQuantity}%`}
                warn={primaryLock.electricQuantity <= 20}
              />
            ) : null}
            {primaryLock.linked_to_context_at ? (
              <FactChip
                icon="link-outline"
                label={formatDateTime(primaryLock.linked_to_context_at, i18n.language)}
              />
            ) : null}
            {primaryLock.added_to_system_at ? (
              <FactChip
                icon="cloud-upload-outline"
                label={formatDateTime(primaryLock.added_to_system_at, i18n.language)}
              />
            ) : null}
          </View>
          {(primaryLock.current_links?.length ?? 0) > 1 ? (
            <Text style={styles.otherLinks}>
              {t('detailAlsoLinked', { count: primaryLock.current_links!.length - 1 })}
            </Text>
          ) : null}
        </Pressable>
      ) : null}

      <View style={styles.actions}>
        {hasLock && primaryLock ? (
          <>
            <Button label={t('unlock')} onPress={() => void onUnlock()} />
            <Button label={t('detailOpenLock')} variant="ghost" onPress={goToLockDetail} />
            <Button label={t('unlinkLock')} variant="danger" loading={busy} onPress={onUnlink} />
          </>
        ) : (
          <>
            <Button label={t('programLock')} onPress={tryAddLock} />
            <Button label={t('linkExisting')} variant="ghost" onPress={tryLinkExisting} />
          </>
        )}
      </View>

      {linkTimeline.length > 0 ? (
        <View style={styles.section}>
          <Text style={appStyles.sectionTitle}>{t('detailLinkTimeline')}</Text>
          {linkTimeline.slice(0, 12).map((ev) => (
            <View key={ev.id} style={styles.timelineRow}>
              <View
                style={[
                  styles.timelineDot,
                  ev.action === 'linked' ? styles.timelineDotLink : styles.timelineDotUnlink,
                ]}
              />
              <View style={styles.timelineBody}>
                <Text style={styles.timelineTitle}>
                  {ev.action === 'linked' ? t('detailEventLinked') : t('detailEventUnlinked')}{' '}
                  {ev.property_label || `${ev.property_type} #${ev.property_id}`}
                </Text>
                <Text style={styles.timelineMeta}>{formatDateTime(ev.occurred_at, i18n.language)}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {showScan && !hasLock ? (
        <View style={styles.scanBlock}>
          <ScanLocksPanel autoStart onInitialized={onProvision} />
        </View>
      ) : null}

      <Text style={[appStyles.sectionTitle, styles.historyHeading]}>{t('history')}</Text>
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
        propertyId={propertyId}
        onClose={() => setLinkSheet(false)}
        onLinked={() => {
          void invalidate();
          void refetchBootstrap();
          void refetchDetail();
          Alert.alert(t('done'), t('linkSuccess'));
        }}
      />
      <LockPayloadConfirmModal
        visible={pendingRegister !== null}
        title={t('registerPayloadTitle')}
        payload={
          pendingRegister
            ? {
                api: 'POST /api/lock-setup/tenants/{tenant}/locks then link',
                propertyType,
                propertyId,
                body: pendingRegister,
              }
            : {}
        }
        loading={busy}
        onCancel={() => setPendingRegister(null)}
        onConfirm={() => void confirmProvision()}
      />
    </>
  );
}

function MetaItem({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metaItem}>
      <Ionicons name={icon} size={16} color={colors.muted} />
      <View style={styles.metaText}>
        <Text style={styles.metaLabel}>{label}</Text>
        <Text style={styles.metaValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function FactChip({
  icon,
  label,
  warn,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  warn?: boolean;
}) {
  return (
    <View style={[styles.chip, warn && styles.chipWarn]}>
      <Ionicons name={icon} size={14} color={warn ? colors.danger : colors.accent} />
      <Text style={[styles.chipText, warn && { color: colors.danger }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.md, paddingTop: spacing.sm },
  hero: {
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    gap: spacing.md,
    ...elevation.card,
  },
  heroLinked: { borderColor: colors.success, backgroundColor: colors.cardElevated },
  heroOpen: { borderColor: colors.borderSubtle, backgroundColor: colors.card },
  heroTop: { flexDirection: 'row' },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.accentSoft,
  },
  statusOn: { backgroundColor: colors.successSoft },
  statusText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  statusTextOn: { color: colors.success },
  heroTitle: { color: colors.text, fontSize: 34, fontWeight: '800', letterSpacing: -0.6 },
  metaGrid: { gap: spacing.sm },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  metaText: { flex: 1, minWidth: 0 },
  metaLabel: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  metaValue: { color: colors.text, fontSize: 15, fontWeight: '600', marginTop: 2 },
  lockCard: {
    ...appStyles.card,
    gap: spacing.sm,
  },
  lockCardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  openLock: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  openLockText: { color: colors.accent, fontWeight: '600', fontSize: 13 },
  lockAlias: { color: colors.text, fontSize: 18, fontWeight: '700' },
  lockMac: { color: colors.textSecondary, fontFamily: 'monospace', fontSize: 13 },
  lockFacts: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.sm,
    backgroundColor: colors.cardElevated,
    maxWidth: '100%',
  },
  chipWarn: { backgroundColor: colors.dangerSoft },
  chipText: { color: colors.textSecondary, fontSize: 11, fontWeight: '600' },
  otherLinks: { color: colors.muted, fontSize: 12, marginTop: spacing.xs },
  actions: { gap: spacing.sm },
  section: { gap: spacing.sm },
  timelineRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  timelineDotLink: { backgroundColor: colors.success },
  timelineDotUnlink: { backgroundColor: colors.warning },
  timelineBody: { flex: 1, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
  timelineTitle: { color: colors.text, fontWeight: '600', fontSize: 14 },
  timelineMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
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
  scanBlock: { marginTop: spacing.sm },
});
