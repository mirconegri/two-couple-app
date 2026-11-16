import React, { useCallback } from 'react';
import {
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type View,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { useHaptics, type SimpleHaptic } from '../lib/haptics';
import { useTheme } from '../theme/ThemeProvider';
import { withAlpha } from '../theme/color';
import { pressSpring } from '../theme/motion';
import { stateLayer } from '../theme/tokens';

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** Corner radius the ripple is clipped to; must match the surface it fills. */
  rippleRadius?: number;
  scaleTo?: number;
  haptics?: SimpleHaptic | null;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const PressableScale = React.forwardRef<View, PressableScaleProps>(
  function PressableScale(
    {
      children,
      style,
      rippleRadius,
      scaleTo = 1,
      haptics = null,
      disabled = false,
      onPress,
      onPressIn,
      onPressOut,
      ...rest
    },
    ref,
  ) {
    const { colors, reducedMotion } = useTheme();
    const feedback = useHaptics();
    const scale = useSharedValue(1);

    const handlePress = useCallback(
      (event: GestureResponderEvent) => {
        if (haptics) feedback[haptics]();
        onPress?.(event);
      },
      [feedback, haptics, onPress],
    );

    const handlePressIn = useCallback(
      (event: GestureResponderEvent) => {
        if (!reducedMotion && scaleTo !== 1) scale.value = withSpring(scaleTo, pressSpring);
        onPressIn?.(event);
      },
      [onPressIn, reducedMotion, scale, scaleTo],
    );

    const handlePressOut = useCallback(
      (event: GestureResponderEvent) => {
        if (!reducedMotion && scaleTo !== 1) scale.value = withSpring(1, pressSpring);
        onPressOut?.(event);
      },
      [onPressOut, reducedMotion, scale, scaleTo],
    );

    const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

    return (
      <AnimatedPressable
        ref={ref}
        disabled={disabled}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        android_ripple={
          disabled
            ? undefined
            : { color: withAlpha(colors.onSurface, stateLayer.pressed), foreground: true }
        }
        android_disableSound
        style={[
          style,
          // Clipping the foreground ripple to the rounded bounds is the only way to shape it.
          rippleRadius !== undefined && { borderRadius: rippleRadius, overflow: 'hidden' },
          animatedStyle,
        ]}
        {...rest}
      >
        {children}
      </AnimatedPressable>
    );
  },
);
