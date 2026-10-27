import React, { useCallback } from 'react';
import {
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type View,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { duration, spring } from '../theme/motion';

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  scaleTo?: number;
  haptics?: 'light' | 'selection' | null;
  style?: StyleProp<ViewStyle>;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const PressableScale = React.forwardRef<View, PressableScaleProps>(
  function PressableScale(
    {
      children,
      style,
      scaleTo = 0.96,
      haptics = null,
      disabled = false,
      onPress,
      onPressIn,
      onPressOut,
      accessibilityRole,
      accessibilityLabel,
      accessibilityState,
      hitSlop,
      onLongPress,
      ...rest
    },
    ref,
  ) {
    const scale = useSharedValue(1);
    const opacity = useSharedValue(1);
    const reducedMotion = useReducedMotion();

    const handlePress = useCallback(
      (e: GestureResponderEvent) => {
        if (!disabled && haptics) {
          if (haptics === 'light') {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          } else if (haptics === 'selection') {
            void Haptics.selectionAsync();
          }
        }
        onPress?.(e);
      },
      [disabled, haptics, onPress],
    );

    const handlePressIn = useCallback(
      (e: GestureResponderEvent) => {
        if (reducedMotion) {
          opacity.value = withTiming(0.9, { duration: duration.fast });
        } else {
          scale.value = withSpring(scaleTo, spring.press);
          opacity.value = withTiming(0.9, { duration: 100 });
        }

        onPressIn?.(e);
      },
      [onPressIn, opacity, reducedMotion, scale, scaleTo],
    );

    const handlePressOut = useCallback(
      (e: GestureResponderEvent) => {
        if (reducedMotion) {
          opacity.value = withTiming(1, { duration: duration.fast });
        } else {
          scale.value = withSpring(1, spring.press);
          opacity.value = withTiming(1, { duration: duration.fast });
        }

        onPressOut?.(e);
      },
      [onPressOut, opacity, reducedMotion, scale],
    );

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    }));

    return (
      <AnimatedPressable
        ref={ref}
        disabled={disabled}
        accessibilityRole={accessibilityRole}
        accessibilityLabel={accessibilityLabel}
        accessibilityState={accessibilityState}
        hitSlop={hitSlop}
        onPress={handlePress}
        onLongPress={onLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[style, animatedStyle]}
        {...rest}
      >
        {children}
      </AnimatedPressable>
    );
  },
);
