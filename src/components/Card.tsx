import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { elevation as elevationTokens, shape, spacing } from '../theme/tokens';
import { PressableScale } from './PressableScale';

export type CardVariant = 'filled' | 'elevated' | 'outlined';

export interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function Card({
  children,
  variant = 'filled',
  onPress,
  style,
  accessibilityLabel,
}: CardProps) {
  const { colors } = useTheme();

  const surface: StyleProp<ViewStyle> = [
    styles.card,
    {
      backgroundColor: variant === 'filled' ? colors.surfaceContainerHighest : colors.surfaceContainerLow,
      borderWidth: variant === 'outlined' ? 1 : 0,
      borderColor: colors.outlineVariant,
    },
    variant === 'elevated' && {
      shadowColor: colors.shadow,
      shadowOpacity: 0.2,
      shadowRadius: elevationTokens.level1,
      shadowOffset: { width: 0, height: 1 },
      elevation: elevationTokens.level1,
    },
    style,
  ];

  if (!onPress) {
    return <View style={surface}>{children}</View>;
  }

  return (
    <PressableScale
      onPress={onPress}
      haptics="selection"
      scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={surface}
    >
      {children}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: shape.lg, padding: spacing.lg, overflow: 'hidden' },
});
