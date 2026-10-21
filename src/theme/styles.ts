import { StyleSheet } from 'react-native';

import { colors } from '@/src/theme/colors';
import { elevation, radii, spacing } from '@/src/theme/tokens';

export const appStyles = StyleSheet.create({
  screenPad: {
    paddingHorizontal: spacing.lg,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...elevation.card,
  },
  cardFlat: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  sectionTitle: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
});
