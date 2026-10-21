import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleSheet,
  Text,
} from 'react-native';

import { colors } from '@/src/theme/colors';
import { radii, spacing } from '@/src/theme/tokens';

type Props = PressableProps & {
  label: string;
  variant?: 'primary' | 'ghost' | 'danger';
  loading?: boolean;
};

export function Button({ label, variant = 'primary', loading, disabled, ...rest }: Props) {
  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        isPrimary && styles.primary,
        variant === 'ghost' && styles.ghost,
        isDanger && styles.danger,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.accentOn : colors.accent} />
      ) : (
        <Text
          style={[
            styles.label,
            isPrimary && styles.labelPrimary,
            variant === 'ghost' && styles.labelGhost,
            isDanger && styles.labelDanger,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primary: {
    backgroundColor: colors.accent,
  },
  ghost: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardElevated,
  },
  danger: {
    backgroundColor: colors.dangerSurface,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  label: { fontSize: 16, fontWeight: '600' },
  labelPrimary: { color: colors.accentOn },
  labelGhost: { color: colors.text },
  labelDanger: { color: colors.danger },
});
