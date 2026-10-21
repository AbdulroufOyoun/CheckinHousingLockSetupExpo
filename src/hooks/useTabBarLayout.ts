import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { spacing } from '@/src/theme/tokens';

const TAB_BAR_CONTENT_HEIGHT = 56;

export function useTabBarLayout() {
  const insets = useSafeAreaInsets();
  const { tabLabelSize, isLandscape } = useResponsiveLayout();

  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 20 : 0);
  const sideInset = Math.max(insets.left, insets.right);
  const tabBarHeight = TAB_BAR_CONTENT_HEIGHT + bottomInset + (isLandscape ? 2 : 0);

  return {
    tabBarHeight,
    bottomInset,
    sideInset,
    tabLabelSize,
    tabBarStyle: {
      height: tabBarHeight,
      paddingTop: spacing.sm,
      paddingBottom: bottomInset,
      paddingLeft: Math.max(sideInset, spacing.sm),
      paddingRight: Math.max(sideInset, spacing.sm),
    },
    tabBarLabelStyle: {
      fontSize: tabLabelSize,
      fontWeight: '600' as const,
      marginTop: 2,
      marginBottom: Platform.OS === 'android' ? 2 : 0,
    },
  };
}
