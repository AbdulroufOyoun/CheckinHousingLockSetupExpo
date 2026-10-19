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

export function PropertySkeleton() {
  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Skeleton style={{ height: 56, borderRadius: 16 }} />
      <Skeleton style={{ height: 120, borderRadius: 16 }} />
      <Skeleton style={{ height: 120, borderRadius: 16 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.cardElevated,
  },
});
