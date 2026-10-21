import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/src/theme/colors';
import { elevation, radii, spacing } from '@/src/theme/tokens';
import type { PropertyUnitStats } from '@/src/utils/propertyStats';

type Props = {
  stats: PropertyUnitStats;
};

export function PropertySummaryCard({ stats }: Props) {
  const { t } = useTranslation();
  const total = stats.suites + stats.rooms;

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>{t('propertySummary')}</Text>
      <View style={styles.row}>
        <Stat label={t('propertyStatTotal')} value={String(total)} accent />
        <Stat label={t('propertyStatSuites')} value={String(stats.suites)} />
        <Stat label={t('propertyStatRooms')} value={String(stats.rooms)} />
      </View>
      <View style={styles.row}>
        <Stat label={t('propertyStatWithLock')} value={String(stats.withLock)} accent={colors.success} />
        <Stat label={t('propertyStatNoLock')} value={String(stats.withoutLock)} />
      </View>
    </View>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean | string;
}) {
  const valueColor = accent === true ? colors.accent : typeof accent === 'string' ? accent : colors.text;
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: valueColor }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statLabel} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.md,
    gap: spacing.sm,
    ...elevation.card,
  },
  heading: { color: colors.text, fontWeight: '700', fontSize: 15 },
  row: { flexDirection: 'row', gap: 8 },
  stat: {
    flex: 1,
    backgroundColor: colors.cardElevated,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  statValue: { color: colors.text, fontSize: 18, fontWeight: '800' },
  statLabel: { color: colors.muted, fontSize: 11, marginTop: 4, textAlign: 'center' },
});
