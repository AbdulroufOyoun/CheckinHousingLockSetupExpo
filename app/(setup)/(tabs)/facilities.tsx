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

import { useBootstrap } from '@/src/hooks/useBootstrap';
import { unlockWithLock } from '@/src/services/unlockService';
import { useSession } from '@/src/store/session';
import { colors } from '@/src/theme/colors';
import { facilityDisplayName } from '@/src/utils/lockMerge';

export default function FacilitiesTab() {
  const { t, i18n: i18nInstance } = useTranslation();
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
              Alert.alert(t('errorGeneric'), e instanceof Error ? e.message : t('unlockFailed'));
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
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={colors.accent} />
      }
      ListEmptyComponent={<Text style={styles.empty}>{t('emptyFacilities')}</Text>}
      renderItem={({ item }) => (
        <Pressable
          style={styles.row}
          onPress={() => router.push(`/(setup)/property/facility/${item.id}`)}
          onLongPress={() => longPressUnlock(item)}
          delayLongPress={400}
        >
          <Text style={styles.title}>{facilityDisplayName(item, i18nInstance.language)}</Text>
          <Text style={styles.meta}>{item.has_lock ? '🔒' : t('noLock')}</Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  list: { padding: 16, paddingBottom: 40 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 48 },
  row: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { color: colors.text, fontWeight: '600', fontSize: 16 },
  meta: { color: colors.muted, marginTop: 4 },
});
