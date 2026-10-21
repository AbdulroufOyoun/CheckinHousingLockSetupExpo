import React, { useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/src/theme/colors';

export function Skeleton({ style }: { style?: ViewStyle }) {
  const opacity = useSharedValue(0.35);
  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.85, { duration: 900 }), -1, true);
  }, [opacity]);
  const anim = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[styles.base, style, anim]} />;
}

export function UnlinkedSkeleton() {
  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Skeleton style={{ height: 88, borderRadius: 16 }} />
      <Skeleton style={{ height: 48, borderRadius: 14 }} />
      <Skeleton style={{ height: 72, borderRadius: 14 }} />
      <Skeleton style={{ height: 72, borderRadius: 14 }} />
      <Skeleton style={{ height: 72, borderRadius: 14 }} />
    </View>
  );
}

export function PropertySkeleton() {
  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Skeleton style={{ height: 120, borderRadius: 16 }} />
      <Skeleton style={{ height: 48, borderRadius: 14 }} />
      <Skeleton style={{ height: 36, borderRadius: 999, width: '70%' }} />
      <Skeleton style={{ height: 140, borderRadius: 16 }} />
      <Skeleton style={{ height: 140, borderRadius: 16 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.cardElevated,
  },
});
