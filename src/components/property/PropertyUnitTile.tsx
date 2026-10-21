import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/src/theme/colors';

type UnitKind = 'room' | 'suite';

const CELL_GUTTER = 8;

type Props = {
  kind: UnitKind;
  title: string;
  linked: boolean;
  columns: number;
  onPress: () => void;
};

export function PropertyUnitTile({ kind, title, linked, columns, onPress }: Props) {
  const colPercent = 100 / columns;

  return (
    <View style={[styles.cell, { width: `${colPercent}%` as `${number}%` }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        onPress={() => {
          void Haptics.selectionAsync();
          onPress();
        }}
        style={({ pressed }) => [
          styles.tile,
          { minHeight: kind === 'suite' ? 88 : 72 },
          linked && styles.tileLinked,
          pressed && styles.pressed,
        ]}
      >
        <Ionicons
          name={kind === 'suite' ? 'layers-outline' : 'bed-outline'}
          size={18}
          color={colors.muted}
        />
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <View style={[styles.lockBadge, linked ? styles.lockOn : styles.lockOff]}>
          <Ionicons
            name={linked ? 'lock-closed' : 'lock-open-outline'}
            size={14}
            color={linked ? colors.success : colors.muted}
          />
        </View>
      </Pressable>
    </View>
  );
}

export const PROPERTY_GRID_GUTTER = CELL_GUTTER;

const styles = StyleSheet.create({
  cell: {
    padding: CELL_GUTTER / 2,
  },
  tile: {
    width: '100%',
    backgroundColor: colors.cardElevated,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tileLinked: {
    borderColor: colors.success,
    backgroundColor: colors.successSoft,
  },
  pressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
  title: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 15,
    textAlign: 'center',
  },
  lockBadge: {
    marginTop: 2,
    borderRadius: 999,
    padding: 4,
  },
  lockOn: { backgroundColor: colors.successSoft },
  lockOff: { backgroundColor: colors.accentSoft },
});
