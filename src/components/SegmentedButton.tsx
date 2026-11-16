import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../theme/ThemeProvider';
import { buttonHeight, iconSize, shape, spacing } from '../theme/tokens';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedButtonProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedButton<T extends string>({
  options,
  value,
  onChange,
}: SegmentedButtonProps<T>) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { borderColor: colors.outline }]}>
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <React.Fragment key={option.value}>
            {index > 0 ? (
              <View style={[styles.divider, { backgroundColor: colors.outline }]} />
            ) : null}
            <PressableScale
              onPress={() => onChange(option.value)}
              haptics="tick"
              accessibilityRole="button"
              accessibilityLabel={option.label}
              accessibilityState={{ selected }}
              style={[
                styles.segment,
                { backgroundColor: selected ? colors.secondaryContainer : 'transparent' },
              ]}
            >
              {selected ? (
                <Ionicons
                  name="checkmark"
                  size={iconSize.sm}
                  color={colors.onSecondaryContainer}
                  style={styles.check}
                />
              ) : null}
              <Text
                variant="labelLarge"
                color={selected ? 'onSecondaryContainer' : 'onSurface'}
                numberOfLines={1}
              >
                {option.label}
              </Text>
            </PressableScale>
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'stretch',
    height: buttonHeight.small,
    borderWidth: 1,
    borderRadius: shape.full,
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  divider: { width: StyleSheet.hairlineWidth },
  check: { marginRight: spacing.xs },
});
