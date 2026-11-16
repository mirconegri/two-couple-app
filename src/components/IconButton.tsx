import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../theme/ThemeProvider';
import { MIN_TOUCH_TARGET, iconSize, shape } from '../theme/tokens';
import { PressableScale } from './PressableScale';
import type { ColorScheme } from '../theme/color';

export type IconButtonVariant = 'standard' | 'filled' | 'tonal' | 'outlined';

export interface IconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  accessibilityLabel: string;
  variant?: IconButtonVariant;
  size?: 'sm' | 'md';
  disabled?: boolean;
  selected?: boolean;
  color?: keyof ColorScheme;
}

const containerSize = { sm: 32, md: 40 } as const;

export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  variant = 'standard',
  size = 'md',
  disabled = false,
  selected = false,
  color,
}: IconButtonProps) {
  const { colors } = useTheme();

  const active = selected && variant !== 'standard';
  const background =
    variant === 'filled'
      ? active
        ? colors.primary
        : colors.surfaceContainerHighest
      : variant === 'tonal'
        ? active
          ? colors.secondaryContainer
          : colors.surfaceContainerHighest
        : 'transparent';

  const foreground = color
    ? colors[color]
    : variant === 'filled'
      ? active
        ? colors.onPrimary
        : colors.onSurfaceVariant
      : variant === 'tonal'
        ? active
          ? colors.onSecondaryContainer
          : colors.onSurfaceVariant
        : active
          ? colors.primary
          : colors.onSurfaceVariant;

  const box = containerSize[size];

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      haptics="light"
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, selected: selected || undefined }}
      rippleRadius={box / 2}
      style={[styles.target, { opacity: disabled ? 0.38 : 1 }]}
    >
      <View
        style={[
          styles.container,
          {
            width: box,
            height: box,
            borderRadius: shape.full,
            backgroundColor: background,
            borderWidth: variant === 'outlined' && !active ? 1 : 0,
            borderColor: colors.outlineVariant,
          },
        ]}
      >
        <Ionicons name={icon} size={size === 'sm' ? iconSize.sm : iconSize.md} color={foreground} />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  target: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: { alignItems: 'center', justifyContent: 'center' },
});
