import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/src/theme/colors';

export function Screen({ children, style, ...rest }: ViewProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }, style]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
  },
});
