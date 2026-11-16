import React from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../theme/ThemeProvider';
import { elevation as elevationTokens, iconSize, shape, spacing } from '../theme/tokens';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export type FabSize = 'small' | 'regular' | 'large';
export type FabVariant = 'primary' | 'secondary' | 'tertiary';

export interface FabProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  label?: string;
  size?: FabSize;
  variant?: FabVariant;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

const box = { small: 40, regular: 56, large: 96 } as const;
const radius = { small: shape.md, regular: shape.lg, large: shape.xl } as const;

export function Fab({
  icon,
  onPress,
  label,
  size = 'regular',
  variant = 'primary',
  accessibilityLabel,
  style,
}: FabProps) {
  const { colors } = useTheme();

  const container = {
    primary: colors.primaryContainer,
    secondary: colors.secondaryContainer,
    tertiary: colors.tertiaryContainer,
  }[variant];

  const content = {
    primary: colors.onPrimaryContainer,
    secondary: colors.onSecondaryContainer,
    tertiary: colors.onTertiaryContainer,
  }[variant];

  const extended = Boolean(label);

  return (
    <PressableScale
      onPress={onPress}
      haptics="light"
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label ?? icon}
      rippleRadius={radius[size]}
      style={[
        styles.fab,
        {
          height: extended ? box.regular : box[size],
          paddingHorizontal: extended ? spacing.lg : 0,
          width: extended ? undefined : box[size],
          borderRadius: radius[size],
          backgroundColor: container,
          shadowColor: colors.shadow,
          shadowOpacity: 0.3,
          shadowRadius: elevationTokens.level3,
          shadowOffset: { width: 0, height: 4 },
          elevation: elevationTokens.level3,
        },
        style,
      ]}
    >
      <Ionicons name={icon} size={size === 'large' ? iconSize.lg : iconSize.md} color={content} />
      {extended ? (
        <Text variant="labelLarge" style={[styles.label, { color: content }]}>
          {label}
        </Text>
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  fab: { alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  label: { marginLeft: spacing.sm },
});
