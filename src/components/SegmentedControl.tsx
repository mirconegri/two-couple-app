import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { PressableScale } from './PressableScale';

interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: ViewStyle;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  style,
}: SegmentedControlProps<T>) {
  const { colors, shape, spacing, typography } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceContainerHigh,
          borderRadius: shape.md,
          padding: 2,
        },
        style,
      ]}
    >
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <PressableScale
            key={option.value}
            onPress={() => onChange(option.value)}
            haptics="selection"
            scaleTo={0.96}
            style={[
              styles.segment,
              {
                borderRadius: shape.sm,
                backgroundColor: isSelected ? colors.surfaceContainerLow : 'transparent',
                paddingVertical: spacing.xs + 2,
              },
            ]}
          >
            <Text
              style={[
                typography.bodyMedium,
                {
                  color: isSelected ? colors.onSurface : colors.onSurfaceVariant,
                  fontWeight: isSelected ? '600' : '400',
                },
              ]}
            >
              {option.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
