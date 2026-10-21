import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import { colors } from '@/src/theme/colors';
import { radii, spacing } from '@/src/theme/tokens';

type Props = TextInputProps & {
  label: string;
  error?: string;
};

export function TextField({ label, error, style, onFocus, onBlur, ...rest }: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.placeholder}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          styles.input,
          focused && styles.inputFocused,
          error && styles.inputError,
          style,
        ]}
        {...rest}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs + 2, marginBottom: spacing.md + 2 },
  label: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  input: {
    backgroundColor: colors.cardElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: 16,
    minHeight: 48,
  },
  inputFocused: {
    borderColor: colors.focus,
    backgroundColor: colors.card,
  },
  inputError: { borderColor: colors.danger },
  error: { color: colors.danger, fontSize: 12 },
});
