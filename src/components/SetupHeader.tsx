import { router } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useSession } from '@/src/store/session';
import { colors } from '@/src/theme/colors';

export function SetupHeader() {
  const { t } = useTranslation();
  const { tenantDomain, tenantId } = useSession();
  const label = tenantDomain ?? tenantId ?? '—';

  return (
    <View style={styles.row}>
      <Pressable onPress={() => router.push('/(setup)/tenants')} style={styles.tenant}>
        <Text style={styles.tenantText} numberOfLines={1}>
          {label}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.muted} />
      </Pressable>
      <View style={styles.actions}>
        <Pressable
          accessibilityLabel={t('programNewLock')}
          onPress={() => router.push('/(setup)/locks/quick-provision')}
          style={styles.iconBtn}
        >
          <Ionicons name="add-circle-outline" size={26} color={colors.accent} />
        </Pressable>
        <Pressable
          accessibilityLabel={t('settings')}
          onPress={() => router.push('/(setup)/settings')}
          style={styles.iconBtn}
        >
          <Ionicons name="settings-outline" size={24} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  tenant: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1, marginRight: 8 },
  tenantText: { color: colors.text, fontSize: 17, fontWeight: '700', flexShrink: 1 },
  actions: { flexDirection: 'row', gap: 4 },
  iconBtn: { padding: 6 },
});
