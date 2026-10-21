import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/src/theme/colors';

type Props = {
  total: number;
  loaded: number;
  hasSearch: boolean;
  isSyncing?: boolean;
};

export function UnlinkedSummaryCard({ total, loaded, hasSearch, isSyncing }: Props) {
  const { t } = useTranslation();

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.iconWrap}>
          <Ionicons name="link-outline" size={22} color={colors.accent} />
        </View>
        <View style={styles.headText}>
          <Text style={styles.title}>{t('unlinkedSummaryTitle')}</Text>
          <Text style={styles.sub}>
            {hasSearch
              ? t('unlinkedCountSearch', { shown: loaded, total })
              : t('unlinkedCount', { shown: loaded, total })}
          </Text>
        </View>
      </View>
      {loaded < total ? (
        <Text style={styles.hint}>{t('unlinkedScrollHint')}</Text>
      ) : null}
      {isSyncing ? (
        <Text style={styles.sync}>{t('unlinkedSyncing')}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 8,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headText: { flex: 1, minWidth: 0 },
  title: { color: colors.text, fontWeight: '700', fontSize: 16 },
  sub: { color: colors.muted, fontSize: 13, marginTop: 2 },
  hint: { color: colors.muted, fontSize: 12 },
  sync: { color: colors.accent, fontSize: 12, fontWeight: '600' },
});
