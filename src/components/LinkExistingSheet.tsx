import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { showUserErrorAlert } from '@/src/api/formatApiError';
import { fetchTenantLocks, linkLock } from '@/src/api/lockSetupClient';
import { Button } from '@/src/components/ui/Button';
import { colors } from '@/src/theme/colors';
import { radii, spacing } from '@/src/theme/tokens';
import type { PropertyType } from '@/src/types/models';

type Props = {
  visible: boolean;
  propertyType: PropertyType;
  propertyId: number;
  onClose: () => void;
  onLinked: () => void;
};

export function LinkExistingSheet({
  visible,
  propertyType,
  propertyId,
  onClose,
  onLinked,
}: Props) {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ['unlinked-for-link'],
    queryFn: () => fetchTenantLocks('unlinked', { page: 1, perPage: 50 }),
    enabled: visible,
  });
  const syncWarning =
    data?.ttlock_sync && data.ttlock_sync.success === false && data.ttlock_sync.message
      ? t('ttlockSyncFailed', { message: data.ttlock_sync.message })
      : null;
  const [busyId, setBusyId] = React.useState<number | null>(null);

  const link = async (lockDbId: number) => {
    setBusyId(lockDbId);
    try {
      await linkLock(propertyType, propertyId, lockDbId);
      onLinked();
      onClose();
    } catch (e) {
      showUserErrorAlert(t, e, 'link');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{t('linkExisting')}</Text>
          {syncWarning ? <Text style={styles.syncWarn}>{syncWarning}</Text> : null}
          {isLoading ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <FlatList
              data={data?.locks ?? []}
              keyExtractor={(item) => String(item.id)}
              ListEmptyComponent={<Text style={styles.empty}>{t('emptyUnlinked')}</Text>}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.row}
                  disabled={busyId !== null}
                  onPress={() => void link(item.id)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{item.lockAlias || item.lockName}</Text>
                    <Text style={styles.meta}>{item.lockMac}</Text>
                  </View>
                  {busyId === item.id ? (
                    <ActivityIndicator color={colors.accent} />
                  ) : (
                    <Text style={styles.link}>{t('linkExisting')}</Text>
                  )}
                </Pressable>
              )}
            />
          )}
          <Button label={t('done')} variant="ghost" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.cardElevated,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
    maxHeight: '70%',
    gap: spacing.md,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: '700' },
  syncWarn: { color: colors.warning, fontSize: 13, lineHeight: 18 },
  empty: { color: colors.muted, padding: 16, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  name: { color: colors.text, fontWeight: '600' },
  meta: { color: colors.muted, fontSize: 12 },
  link: { color: colors.accent, fontWeight: '600' },
});
