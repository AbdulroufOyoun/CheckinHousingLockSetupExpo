import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { colors } from '@/src/theme/colors';
import type { PropertyLockFilter } from '@/src/utils/propertyStats';

type Props = {
  value: PropertyLockFilter;
  onChange: (value: PropertyLockFilter) => void;
};

const OPTIONS: PropertyLockFilter[] = ['all', 'linked', 'noLock'];

export function PropertyFilterChips({ value, onChange }: Props) {
  const { t } = useTranslation();

  const label = (key: PropertyLockFilter) => {
    if (key === 'linked') return t('filterWithLock');
    if (key === 'noLock') return t('filterNoLock');
    return t('filterAll');
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      keyboardShouldPersistTaps="handled"
    >
      {OPTIONS.map((opt) => {
        const active = value === opt;
        return (
          <Pressable
            key={opt}
            onPress={() => onChange(opt)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{label(opt)}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  chipText: { color: colors.muted, fontWeight: '600', fontSize: 13 },
  chipTextActive: { color: colors.accent },
});
