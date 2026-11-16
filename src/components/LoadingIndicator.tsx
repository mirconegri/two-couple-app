import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '../theme/ThemeProvider';
import { shape } from '../theme/tokens';
import { withAlpha } from '../theme/color';

export interface LoadingIndicatorProps {
  size?: number;
  color?: string;
}

/** Material 3 circular progress indicator. */
export function LoadingIndicator({ size = 24, color }: LoadingIndicatorProps) {
  const { colors, reducedMotion } = useTheme();
  const rotation = useSharedValue(0);
  const tint = color ?? colors.primary;

  useEffect(() => {
    if (reducedMotion) {
      rotation.value = 0;
      return;
    }
    rotation.value = withRepeat(
      withTiming(360, { duration: 1100, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(rotation);
  }, [reducedMotion, rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const stroke = Math.max(2, Math.round(size / 9));

  return (
    <View
      accessibilityRole="progressbar"
      style={[
        styles.track,
        {
          width: size,
          height: size,
          borderRadius: shape.full,
          borderWidth: stroke,
          borderColor: withAlpha(tint, 0.2),
        },
      ]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: shape.full,
            borderWidth: stroke,
            borderColor: 'transparent',
            borderTopColor: tint,
          },
          animatedStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { alignItems: 'center', justifyContent: 'center' },
});
