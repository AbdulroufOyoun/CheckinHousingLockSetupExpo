import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { colors } from '@/src/theme/colors';
import { radii, spacing } from '@/src/theme/tokens';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
};

export function SearchBar({ value, onChangeText, placeholder }: Props) {
  const { t } = useTranslation();
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.wrap, focused && styles.wrapFocused]}>
      <Ionicons name="search" size={18} color={focused ? colors.accent : colors.muted} style={styles.icon} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
        returnKeyType="search"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {value.length > 0 ? (
        <Pressable
          accessibilityLabel={t('clearSearch')}
          hitSlop={8}
          onPress={() => onChangeText('')}
          style={styles.clear}
        >
          <Ionicons name="close-circle" size={20} color={colors.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  wrapFocused: {
    borderColor: colors.focus,
    backgroundColor: colors.card,
  },
  icon: { marginEnd: spacing.sm },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    paddingVertical: spacing.md,
  },
  clear: { padding: spacing.xs },
});
