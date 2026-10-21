import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/src/theme/colors';

type Edge = 'top' | 'bottom' | 'left' | 'right';

type Props = ViewProps & {
  /** Safe area edges to pad. Use `['bottom','left','right']` when a stack header is shown. */
  edges?: Edge[];
};

const ALL_EDGES: Edge[] = ['top', 'bottom', 'left', 'right'];

export function Screen({ children, style, edges = ALL_EDGES, ...rest }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.root,
        edges.includes('top') && { paddingTop: insets.top },
        edges.includes('bottom') && { paddingBottom: insets.bottom },
        edges.includes('left') && { paddingLeft: insets.left },
        edges.includes('right') && { paddingRight: insets.right },
        style,
      ]}
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
