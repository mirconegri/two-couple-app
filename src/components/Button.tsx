import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { useTheme } from '../theme/ThemeProvider';
import { buttonHeight, iconSize, shape } from '../theme/tokens';
import { pressSpring } from '../theme/motion';
import { PressableScale } from './PressableScale';
import { Text } from './Text';
import { LoadingIndicator } from './LoadingIndicator';

export type ButtonVariant = 'filled' | 'tonal' | 'outlined' | 'text' | 'elevated' | 'danger';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: 'small' | 'medium';
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  onPress,
  variant = 'filled',
  size = 'small',
  icon,
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
}: ButtonProps) {
  const { colors, elevation, reducedMotion } = useTheme();
  const pressed = useSharedValue(0);

  const height = size === 'small' ? buttonHeight.small : buttonHeight.medium;
  const radius = size === 'small' ? shape.md : shape.lg;
  const pressedRadius = size === 'small' ? shape.sm : shape.md;

  const surface = {
    filled: { container: colors.primary, content: colors.onPrimary, border: 'transparent' },
    danger: { container: colors.error, content: colors.onError, border: 'transparent' },
    tonal: {
      container: colors.secondaryContainer,
      content: colors.onSecondaryContainer,
      border: 'transparent',
    },
    elevated: {
      container: colors.surfaceContainerLow,
      content: colors.primary,
      border: 'transparent',
    },
    outlined: { container: 'transparent', content: colors.primary, border: colors.outline },
    text: { container: 'transparent', content: colors.primary, border: 'transparent' },
  }[variant];

  const animatedStyle = useAnimatedStyle(() => ({
    borderRadius: withSpring(pressed.value ? pressedRadius : radius, pressSpring),
  }));

  const inactive = disabled || loading;

  return (
    <PressableScale
      onPress={onPress}
      disabled={inactive}
      haptics={variant === 'danger' ? 'reject' : 'light'}
      onPressIn={() => {
        if (!reducedMotion) pressed.value = 1;
      }}
      onPressOut={() => {
        pressed.value = 0;
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      hitSlop={size === 'small' ? 4 : 0}
      rippleRadius={radius}
      style={[styles.hug, fullWidth && styles.fullWidth, inactive && styles.inactive, style]}
    >
      <Animated.View
        style={[
          styles.container,
          {
            height,
            paddingHorizontal: size === 'small' ? 24 : 32,
            borderWidth: variant === 'outlined' ? 1 : 0,
            backgroundColor: surface.container,
            borderColor: surface.border,
          },
          variant === 'elevated' && {
            shadowColor: colors.shadow,
            shadowOpacity: 0.16,
            shadowRadius: elevation.level1,
            shadowOffset: { width: 0, height: 1 },
            elevation: elevation.level1,
          },
          animatedStyle,
        ]}
      >
        {loading ? (
          <LoadingIndicator size={iconSize.sm} color={surface.content} />
        ) : icon ? (
          <Ionicons
            name={icon}
            size={iconSize.sm}
            color={surface.content}
            style={styles.icon}
          />
        ) : null}
        <Text variant="labelLarge" style={{ color: surface.content }}>
          {label}
        </Text>
      </Animated.View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  // The outer pressable must match the visible pill, otherwise the ripple overshoots it.
  hug: { alignSelf: 'flex-start' },
  fullWidth: { alignSelf: 'stretch' },
  inactive: { opacity: 0.38 },
  container: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  icon: { marginRight: 8 },
});
