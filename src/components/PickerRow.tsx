import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../theme/ThemeProvider';
import { iconSize, spacing } from '../theme/tokens';
import { SegmentedButton, type SegmentedOption } from './SegmentedButton';
import { Text } from './Text';

export interface PickerRowProps<T extends string> {
  title: string;
  supporting?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function PickerRow<T extends string>({
  title,
  supporting,
  icon,
  options,
  value,
  onChange,
}: PickerRowProps<T>) {
  const { colors } = useTheme();

  return (
    <View style={styles.row}>
      <View style={styles.head}>
        {icon ? (
          <Ionicons name={icon} size={iconSize.md} color={colors.onSurfaceVariant} />
        ) : null}
        <View style={styles.labels}>
          <Text variant="bodyLarge">{title}</Text>
          {supporting ? (
            <Text variant="bodyMedium" color="onSurfaceVariant">
              {supporting}
            </Text>
          ) : null}
        </View>
      </View>

      <SegmentedButton options={options} value={value} onChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.md, padding: spacing.lg },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  labels: { flex: 1, gap: 2 },
});
