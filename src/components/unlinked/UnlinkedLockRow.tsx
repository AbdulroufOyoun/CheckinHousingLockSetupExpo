import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/src/theme/colors';
import { radii, spacing } from '@/src/theme/tokens';
import type { TenantLockRecord } from '@/src/types/models';

type Props = {
  lock: TenantLockRecord;
  onPress: () => void;
};

export function UnlinkedLockRow({ lock, onPress }: Props) {
  const title = lock.lockAlias || lock.lockName || lock.lockId;
  const meta = lock.lockMac || lock.lockId;
  const battery = lock.electricQuantity;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.lead}>
        <Ionicons name="lock-open-outline" size={22} color={colors.accent} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {meta}
        </Text>
      </View>
      {battery != null && battery >= 0 ? (
        <View style={styles.battery}>
          <Ionicons
            name={battery <= 20 ? 'battery-dead-outline' : 'battery-half-outline'}
            size={16}
            color={battery <= 20 ? colors.danger : colors.muted}
          />
          <Text style={[styles.batteryText, battery <= 20 && styles.batteryLow]}>{battery}%</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={20} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
  pressed: { opacity: 0.92 },
  lead: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, minWidth: 0 },
  title: { color: colors.text, fontWeight: '700', fontSize: 16 },
  meta: { color: colors.muted, marginTop: 3, fontSize: 13 },
  battery: { alignItems: 'center', gap: 2, minWidth: 36 },
  batteryText: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  batteryLow: { color: colors.danger },
});
