import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/src/theme/colors';
import type { SiteUnitModel } from '@/src/types/models';

type Props = {
  unit: SiteUnitModel;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

export function SiteUnitRow({ unit, icon, onPress }: Props) {
  return (
    <Pressable
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.92 }]}
    >
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={20} color={colors.accent} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {unit.name}
        </Text>
        {unit.subtitle ? (
          <Text style={styles.meta} numberOfLines={1}>
            {unit.subtitle}
          </Text>
        ) : null}
      </View>
      <View style={[styles.badge, unit.has_lock ? styles.badgeOn : styles.badgeOff]}>
        <Ionicons
          name={unit.has_lock ? 'lock-closed' : 'lock-open-outline'}
          size={14}
          color={unit.has_lock ? colors.success : colors.muted}
        />
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, minWidth: 0 },
  title: { color: colors.text, fontWeight: '700', fontSize: 16 },
  meta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  badge: { borderRadius: 999, padding: 6 },
  badgeOn: { backgroundColor: colors.successSoft },
  badgeOff: { backgroundColor: colors.accentSoft },
});
