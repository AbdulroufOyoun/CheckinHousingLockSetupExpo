import { router } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useSession } from '@/src/store/session';
import { colors } from '@/src/theme/colors';
import { elevation, radii, spacing } from '@/src/theme/tokens';

export function SetupHeader() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { tenantDomain, tenantId } = useSession();
  const label = tenantDomain ?? tenantId ?? '—';

  const horizontalPad = Math.max(insets.left, insets.right, spacing.lg);

  return (
    <View
      style={[
        styles.shell,
        {
          paddingTop: Math.max(insets.top, spacing.sm),
          paddingLeft: horizontalPad,
          paddingRight: horizontalPad,
        },
      ]}
    >
      <View style={styles.row}>
        <Pressable
          onPress={() => router.push('/(setup)/tenants')}
          style={({ pressed }) => [styles.tenantPill, pressed && styles.pressed]}
        >
          <View style={styles.tenantDot} />
          <Text style={styles.tenantText} numberOfLines={1}>
            {label}
          </Text>
          <Ionicons name="chevron-down" size={16} color={colors.muted} />
        </Pressable>
        <View style={styles.actions}>
          <Pressable
            accessibilityLabel={t('programNewLock')}
            onPress={() => router.push('/(setup)/locks/quick-provision')}
            style={({ pressed }) => [styles.actionPrimary, pressed && styles.pressed]}
          >
            <Ionicons name="add" size={22} color={colors.accentOn} />
          </Pressable>
          <Pressable
            accessibilityLabel={t('settings')}
            onPress={() => router.push('/(setup)/settings')}
            style={({ pressed }) => [styles.actionGhost, pressed && styles.pressed]}
          >
            <Ionicons name="settings-outline" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: colors.surfaceAlt,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    paddingBottom: spacing.sm,
    ...elevation.header,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  tenantPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 44,
  },
  tenantDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  tenantText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    flexShrink: 1,
  },
  actions: { flexDirection: 'row', gap: spacing.sm },
  actionPrimary: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionGhost: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.88 },
});
