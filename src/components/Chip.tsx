import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../theme/ThemeProvider';
import { iconSize, shape, spacing } from '../theme/tokens';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export interface ChipProps {
  label: string;
  /** Filter chips show a check when selected; assist chips never do. */
  selected?: boolean;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
}

export function Chip({ label, selected = false, onPress, icon, disabled = false }: ChipProps) {
  const { colors } = useTheme();

  const background = selected ? colors.secondaryContainer : 'transparent';
  const content = selected ? colors.onSecondaryContainer : colors.onSurfaceVariant;

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || !onPress}
      haptics={selected ? 'toggleOff' : 'toggleOn'}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      rippleRadius={shape.sm}
      style={[
        styles.chip,
        {
          backgroundColor: background,
          borderColor: selected ? 'transparent' : colors.outlineVariant,
          borderWidth: selected ? 0 : 1,
          opacity: disabled ? 0.38 : 1,
        },
      ]}
    >
      {selected ? (
        <Ionicons name="checkmark" size={iconSize.sm} color={content} style={styles.icon} />
      ) : icon ? (
        <Ionicons name={icon} size={iconSize.sm} color={content} style={styles.icon} />
      ) : null}
      <Text variant="labelLarge" style={{ color: content }}>
        {label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
    paddingHorizontal: spacing.lg,
    borderRadius: shape.sm,
  },
  icon: { marginRight: spacing.sm },
});
