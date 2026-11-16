import React from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../theme/ThemeProvider';
import { iconSize, spacing } from '../theme/tokens';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export interface SwitchRowProps {
  title: string;
  supporting?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

export function SwitchRow({
  title,
  supporting,
  icon,
  value,
  onChange,
  disabled = false,
}: SwitchRowProps) {
  const { colors } = useTheme();

  return (
    <PressableScale
      onPress={() => onChange(!value)}
      disabled={disabled}
      haptics={value ? 'toggleOff' : 'toggleOn'}
      accessibilityRole="switch"
      accessibilityLabel={title}
      accessibilityState={{ checked: value, disabled }}
      style={[styles.row, disabled && styles.disabled]}
    >
      {icon ? (
        <Ionicons name={icon} size={iconSize.md} color={colors.onSurfaceVariant} />
      ) : null}

      <View style={styles.labels}>
        <Text variant="bodyLarge" numberOfLines={1}>
          {title}
        </Text>
        {supporting ? (
          <Text variant="bodyMedium" color="onSurfaceVariant" numberOfLines={2}>
            {supporting}
          </Text>
        ) : null}
      </View>

      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        pointerEvents="none"
        trackColor={{ false: colors.surfaceContainerHighest, true: colors.primary }}
        thumbColor={value ? colors.onPrimary : colors.outline}
      />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  labels: { flex: 1, gap: 2 },
  disabled: { opacity: 0.38 },
});
