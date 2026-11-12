import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Clipboard,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { showUserErrorAlert } from '@/src/api/formatApiError';
import {
  fetchPropertyDetail,
  fetchPropertyUnlockHistory,
  fetchRoomPasscodes,
} from '@/src/api/lockSetupClient';
import { LinkExistingSheet } from '@/src/components/LinkExistingSheet';
import { PasscodeCreatedSheet } from '@/src/components/PasscodeCreatedSheet';
import {
  PasscodeScheduleSheet,
  type PasscodeScheduleConfirm,
} from '@/src/components/PasscodeScheduleSheet';
import { ScanLocksPanel } from '@/src/components/ScanLocksPanel';
import { Button } from '@/src/components/ui/Button';
import { useBootstrap, useInvalidateBootstrap } from '@/src/hooks/useBootstrap';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { createRandomTimedPasscode } from '@/src/services/passcodeService';
import { buildRegisterPayload, provisionAndLink } from '@/src/services/provisionService';
import { useSession } from '@/src/store/session';
import { colors } from '@/src/theme/colors';
import { appStyles } from '@/src/theme/styles';
import { elevation, radii, spacing } from '@/src/theme/tokens';
import type { LockPasscodeRecord } from '@/src/types/models';
import { findRoom } from '@/src/utils/bootstrapLookup';
import { formatDateTime } from '@/src/utils/formatDateTime';

const HISTORY_PAGE = 15;

type Props = {
  roomId: number;
};

export function RoomDetailScreenContent({ roomId }: Props) {
  const { t, i18n } = useTranslation();
  const { listContentStyle } = useResponsiveLayout();
  const { tenantId } = useSession();
  const { data: bootstrap, refetch: refetchBootstrap } = useBootstrap(tenantId);
  const invalidate = useInvalidateBootstrap();
  const [showScan, setShowScan] = useState(false);
  const [linkSheet, setLinkSheet] = useState(false);
  const [passcodeSheet, setPasscodeSheet] = useState(false);
  const [createdPasscode, setCreatedPasscode] = useState<string | null>(null);
  const [createdAssigneeName, setCreatedAssigneeName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [passcodeBusy, setPasscodeBusy] = useState(false);

  const room = useMemo(() => findRoom(bootstrap, roomId), [bootstrap, roomId]);

  const { data: detail, refetch: refetchDetail, isRefetching } = useQuery({
    queryKey: ['property-detail', tenantId, 'room', roomId],
    queryFn: () => fetchPropertyDetail('room', roomId),
    enabled: Boolean(tenantId),
  });

  const {
    data: passcodesData,
    refetch: refetchPasscodes,
    isRefetching: passcodesRefetching,
  } = useQuery({
    queryKey: ['room-passcodes', tenantId, roomId],
    queryFn: () => fetchRoomPasscodes(roomId),
    enabled: Boolean(tenantId),
  });

  const passcodes = passcodesData?.passcodes ?? [];

  const primaryLock = detail?.locks?.[0];
  const hasLock = Boolean(
    primaryLock?.id ?? room?.has_lock ?? (room?.locks?.length ?? 0) > 0,
  );
  const lockDbId = primaryLock?.id ?? room?.locks?.[0]?.id;

  const title = room?.number ?? detail?.property?.number ?? String(roomId);
  const context = detail?.property;

  const historyQuery = useInfiniteQuery({
    queryKey: ['property-unlock-history', tenantId, 'room', roomId],
    queryFn: ({ pageParam }) => fetchPropertyUnlockHistory('room', roomId, pageParam, HISTORY_PAGE),
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
        propertyType: 'room',
        propertyId: String(roomId),
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

  const onProvision = async (
    lockData: string,
    device: { lockMac: string; lockName: string; electricQuantity: number },
  ) => {
    if (hasLock) return;
    setBusy(true);
    try {
      const payload = buildRegisterPayload(`${title}Lock`, lockData, device);
      await provisionAndLink('room', roomId, payload);
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

  const runGeneratePasscode = async (window: PasscodeScheduleConfirm) => {
    if (!lockDbId) return;
    setPasscodeBusy(true);
    try {
      const created = await createRandomTimedPasscode({
        lockDbId: Number(lockDbId),
        roomId,
        assignedUserId: window.assignedUserId,
        startDate: window.startDate,
        endDate: window.endDate,
        keyboardPwdType: window.keyboardPwdType,
        name: `Room ${title}`,
      });
      setPasscodeSheet(false);
      await refetchPasscodes();
      setCreatedAssigneeName(created.assigned_user?.name ?? null);
      setCreatedPasscode(created.keyboard_pwd);
    } catch (e) {
      showUserErrorAlert(t, e, 'passcode');
    } finally {
      setPasscodeBusy(false);
    }
  };

  const tryGeneratePasscode = () => {
    if (!lockDbId) return;
    setPasscodeSheet(true);
  };

  const header = (
    <View style={styles.header}>
      <View style={[styles.hero, hasLock ? styles.heroLinked : styles.heroOpen]}>
        <Text style={styles.kicker}>{t('roomDetailTitle')}</Text>
        <Text style={styles.heroTitle}>{title}</Text>
        <View style={styles.metaGrid}>
          <MetaItem icon="business-outline" label={t('detailBuilding')} value={context?.building_name ?? '—'} />
          <MetaItem icon="layers-outline" label={t('detailFloor')} value={context?.floor_label ?? '—'} />
          {context?.suite_number ? (
            <MetaItem icon="grid-outline" label={t('detailSuite')} value={String(context.suite_number)} />
          ) : null}
          <MetaItem
            icon="people-outline"
            label={t('detailCapacity')}
            value={context?.capacity != null ? String(context.capacity) : '—'}
          />
          {context?.room_type?.name ? (
            <MetaItem icon="pricetag-outline" label={t('detailRoomType')} value={context.room_type.name} />
          ) : null}
        </View>
      </View>

      {hasLock ? (
        <View style={styles.lockBanner}>
          <Ionicons name="lock-closed" size={22} color={colors.success} />
          <View style={styles.lockBannerText}>
            <Text style={styles.lockBannerTitle}>{t('roomLockAttached')}</Text>
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

      {hasLock ? (
        <View style={styles.passcodeBlock}>
          <View style={styles.passcodeHead}>
            <Text style={appStyles.sectionTitle}>{t('roomPasscodes')}</Text>
            <Button
              label={t('generatePasscode')}
              loading={passcodeBusy}
              onPress={tryGeneratePasscode}
            />
          </View>
          {passcodes.length === 0 ? (
            <Text style={styles.emptyHistory}>{t('roomPasscodesEmpty')}</Text>
          ) : (
            passcodes.map((item) => (
              <PasscodeRow key={item.id} item={item} language={i18n.language} t={t} />
            ))
          )}
        </View>
      ) : null}

      {showScan && !hasLock ? (
        <View style={styles.scanBlock}>
          <ScanLocksPanel autoStart onInitialized={onProvision} />
        </View>
      ) : null}

      <Text style={[appStyles.sectionTitle, styles.historyHeading]}>{t('roomUnlockHistory')}</Text>
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
            refreshing={isRefetching || historyQuery.isRefetching || passcodesRefetching}
            onRefresh={() => {
              void refetchDetail();
              void historyQuery.refetch();
              void refetchPasscodes();
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
        propertyType="room"
        propertyId={roomId}
        onClose={() => setLinkSheet(false)}
        onLinked={() => {
          void invalidate();
          void refetchBootstrap();
          void refetchDetail();
          setLinkSheet(false);
          Alert.alert(t('done'), t('linkSuccess'));
        }}
      />

      <PasscodeScheduleSheet
        visible={passcodeSheet && hasLock}
        busy={passcodeBusy}
        onClose={() => {
          if (!passcodeBusy) setPasscodeSheet(false);
        }}
        onConfirm={(window) => {
          void runGeneratePasscode(window);
        }}
      />

      <PasscodeCreatedSheet
        visible={Boolean(createdPasscode)}
        passcode={createdPasscode}
        assigneeName={createdAssigneeName}
        onClose={() => {
          setCreatedPasscode(null);
          setCreatedAssigneeName(null);
        }}
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

function PasscodeRow({
  item,
  language,
  t,
}: {
  item: LockPasscodeRecord;
  language: string;
  t: (key: string, opts?: Record<string, string>) => string;
}) {
  const [revealed, setRevealed] = useState(false);
  const permanent = item.keyboard_pwd_type === 2 || item.end_date === 0;
  const expired = !permanent && (Boolean(item.is_expired) || item.status === 'expired');
  const digits = item.keyboard_pwd ?? '';
  const masked = digits ? '•'.repeat(Math.max(digits.length, 4)) : '••••';

  return (
    <View style={[styles.passcodeRow, expired ? styles.passcodeRowExpired : null]}>
      <Ionicons name="keypad-outline" size={18} color={expired ? colors.muted : colors.accent} />
      <View style={styles.historyBody}>
        <Text style={styles.passcodeDigits}>{revealed ? digits : masked}</Text>
        <Text style={styles.passcodeAssignee}>
          {item.assigned_user?.name
            ? t('passcodeAssignedTo', { name: item.assigned_user.name })
            : t('passcodeUnassigned')}
        </Text>
        <Text style={styles.historyMeta}>
          {expired
            ? t('passcodeExpired')
            : permanent
              ? t('passcodePermanentLabel')
              : t('passcodeValidUntil', {
                  when: formatDateTime(new Date(item.end_date).toISOString(), language),
                })}
        </Text>
      </View>
      <View style={styles.passcodeRowActions}>
        <Pressable
          onPress={() => setRevealed((v) => !v)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={revealed ? t('passcodeHide') : t('passcodeReveal')}
        >
          <Ionicons
            name={revealed ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={colors.accent}
          />
        </Pressable>
        <Pressable
          onPress={() => {
            try {
              Clipboard.setString(digits);
            } catch {
              /* ignore */
            }
          }}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('passcodeCopy')}
        >
          <Ionicons name="copy-outline" size={20} color={colors.accent} />
        </Pressable>
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
    gap: spacing.md,
    ...elevation.card,
  },
  heroLinked: { borderColor: colors.success, backgroundColor: colors.cardElevated },
  heroOpen: { borderColor: colors.borderSubtle, backgroundColor: colors.card },
  kicker: { color: colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  heroTitle: { color: colors.text, fontSize: 34, fontWeight: '800', letterSpacing: -0.6 },
  metaGrid: { gap: spacing.sm },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  metaText: { flex: 1, minWidth: 0 },
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
  passcodeBlock: { gap: spacing.sm },
  passcodeHead: { gap: spacing.sm },
  passcodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  passcodeRowExpired: { opacity: 0.55 },
  passcodeDigits: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 22,
    letterSpacing: 2,
  },
  passcodeAssignee: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  passcodeRowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
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
