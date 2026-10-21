import { useMemo } from 'react';
import { useWindowDimensions, type ViewStyle } from 'react-native';

import { spacing } from '@/src/theme/tokens';

const TABLET_MIN_SHORT_EDGE = 600;
const WIDE_LAYOUT_MIN_WIDTH = 640;
const CONTENT_MAX_WIDTH = 720;

export function useResponsiveLayout() {
  const { width, height, fontScale } = useWindowDimensions();

  return useMemo(() => {
    const shortEdge = Math.min(width, height);
    const isLandscape = width > height;
    const isTablet = shortEdge >= TABLET_MIN_SHORT_EDGE;
    const isCompactWidth = width < 380;
    const isWideLayout = width >= WIDE_LAYOUT_MIN_WIDTH;

    const pageGutter = isTablet ? spacing.xl : spacing.lg;
    const contentMaxWidth = isTablet || isWideLayout ? CONTENT_MAX_WIDTH : undefined;

    const tabIconSize = isCompactWidth ? 22 : 24;
    const tabLabelSize = isCompactWidth ? 10 : isLandscape && width < 520 ? 10 : 11;

    const listContentStyle: ViewStyle = {
      flexGrow: 1,
      width: '100%',
      maxWidth: contentMaxWidth,
      alignSelf: 'center',
      paddingHorizontal: pageGutter,
      paddingBottom: spacing.xxl,
    };

    const pageContentStyle: ViewStyle = {
      width: '100%',
      maxWidth: contentMaxWidth,
      alignSelf: 'center',
      paddingHorizontal: pageGutter,
    };

    const scrollContentStyle: ViewStyle = {
      flexGrow: 1,
      width: '100%',
      maxWidth: contentMaxWidth,
      alignSelf: 'center',
      paddingHorizontal: pageGutter,
    };

    return {
      width,
      height,
      fontScale,
      isLandscape,
      isTablet,
      isCompactWidth,
      isWideLayout,
      pageGutter,
      contentMaxWidth,
      tabIconSize,
      tabLabelSize,
      listContentStyle,
      pageContentStyle,
      scrollContentStyle,
    };
  }, [width, height, fontScale]);
}
