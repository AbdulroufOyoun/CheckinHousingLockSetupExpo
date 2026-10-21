import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { I18nManager, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/src/theme/colors';
import { elevation, radii, spacing, typography } from '@/src/theme/tokens';

export function LoginHero() {
  const { t } = useTranslation();
  const align = I18nManager.isRTL ? 'right' : 'left';

  return (
    <View style={styles.panel}>
      <View style={styles.glowA} pointerEvents="none" />
      <View style={styles.glowB} pointerEvents="none" />

      <View style={styles.iconCluster}>
        <View style={styles.iconRing}>
          <Ionicons name="lock-closed" size={28} color={colors.accent} />
        </View>
        <View style={styles.iconBadge}>
          <Ionicons name="bluetooth" size={14} color={colors.accentOn} />
        </View>
      </View>

      <Text style={[styles.badge, { textAlign: align }]}>{t('loginHeroBadge')}</Text>
      <Text style={[styles.title, { textAlign: align }]}>{t('appName')}</Text>
      <Text style={[styles.sub, { textAlign: align }]}>{t('loginTitle')}</Text>

      <View style={styles.features}>
        <FeatureChip icon="hardware-chip-outline" label={t('loginFeatureBle')} />
        <FeatureChip icon="cloud-outline" label={t('loginFeatureCloud')} />
        <FeatureChip icon="shield-checkmark-outline" label={t('loginFeatureSecure')} />
      </View>
    </View>
  );
}

function FeatureChip({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <View style={styles.chip}>
      <Ionicons name={icon} size={14} color={colors.accent} />
      <Text style={styles.chipText} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
    ...elevation.card,
  },
  glowA: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.accentSoft,
    opacity: 0.9,
  },
  glowB: {
    position: 'absolute',
    bottom: -50,
    left: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(20, 184, 166, 0.08)',
  },
  iconCluster: {
    alignSelf: 'center',
    marginBottom: spacing.lg,
    marginTop: spacing.xs,
  },
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.cardElevated,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.card,
  },
  badge: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  title: { color: colors.text, ...typography.hero },
  sub: {
    color: colors.textSecondary,
    fontSize: 16,
    marginTop: spacing.sm,
    lineHeight: 24,
  },
  features: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: '100%',
  },
  chipText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
});
