import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React from 'react';
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

import { EmptyState } from '@/src/components/ui/EmptyState';
import { useBootstrap } from '@/src/hooks/useBootstrap';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { showUserErrorAlert } from '@/src/api/formatApiError';
import { unlockWithLock } from '@/src/services/unlockService';
import { useSession } from '@/src/store/session';
import { colors } from '@/src/theme/colors';
import { radii, spacing } from '@/src/theme/tokens';
import { facilityDisplayName } from '@/src/utils/lockMerge';

export default function FacilitiesTab() {
  const { t, i18n: i18nInstance } = useTranslation();
  const { listContentStyle } = useResponsiveLayout();
  const { tenantId } = useSession();
  const { data, isLoading, refetch, isRefetching } = useBootstrap(tenantId);
  const facilities = data?.facilities ?? [];

  const longPressUnlock = (facility: (typeof facilities)[0]) => {
    if (!facility.lock) return;
    Alert.alert(t('unlock'), facilityDisplayName(facility, i18nInstance.language), [
      { text: 'Cancel', style: 'cancel' },
      {
        text: t('unlock'),
        onPress: () => {
          void (async () => {
            try {
              await unlockWithLock(facility.lock);
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert(t('done'), t('unlockSuccess'));
            } catch (e) {
              showUserErrorAlert(t, e, 'unlock');
            }
          })();
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <FlatList
      data={facilities}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={listContentStyle}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={colors.accent} />
      }
      ListEmptyComponent={
        <EmptyState icon="fitness-outline" title={t('emptyFacilities')} />
      }
      renderItem={({ item }) => {
        const name = facilityDisplayName(item, i18nInstance.language);
        return (
          <Pressable
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.92 }]}
            onPress={() => {
              void Haptics.selectionAsync();
              router.push(`/(setup)/property/facility/${item.id}`);
            }}
            onLongPress={() => longPressUnlock(item)}
            delayLongPress={400}
          >
            <View style={styles.iconWrap}>
              <Ionicons name="fitness-outline" size={20} color={colors.accent} />
            </View>
            <View style={styles.body}>
              <Text style={styles.title} numberOfLines={1}>
                {name}
              </Text>
              <Text style={styles.meta}>{item.has_lock ? t('linkSuccess') : t('noLock')}</Text>
            </View>
            <View style={[styles.badge, item.has_lock ? styles.badgeOn : styles.badgeOff]}>
              <Ionicons
                name={item.has_lock ? 'lock-closed' : 'lock-open-outline'}
                size={14}
                color={item.has_lock ? colors.success : colors.muted}
              />
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    gap: spacing.sm,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    backgroundColor: colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, minWidth: 0 },
  title: { color: colors.text, fontWeight: '700', fontSize: 16 },
  meta: { color: colors.textSecondary, marginTop: 2, fontSize: 13 },
  badge: { borderRadius: radii.pill, padding: 6 },
  badgeOn: { backgroundColor: colors.successSoft },
  badgeOff: { backgroundColor: colors.accentSoft },
});
