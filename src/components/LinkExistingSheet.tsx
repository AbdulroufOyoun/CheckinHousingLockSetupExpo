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

import { fetchTenantLocks, linkLock } from '@/src/api/lockSetupClient';
import { Button } from '@/src/components/ui/Button';
import { colors } from '@/src/theme/colors';
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
    queryFn: () => fetchTenantLocks('unlinked', true),
    enabled: visible,
  });
  const [busyId, setBusyId] = React.useState<number | null>(null);

  const link = async (lockDbId: number) => {
    setBusyId(lockDbId);
    try {
      await linkLock(propertyType, propertyId, lockDbId);
      onLinked();
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : t('errorGeneric'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{t('linkExisting')}</Text>
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
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
    gap: 12,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: '700' },
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
