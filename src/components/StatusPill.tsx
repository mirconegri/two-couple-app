import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';

type Tone = 'neutral' | 'pending' | 'success' | 'danger';

export function StatusPill({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const { colors, shape, spacing, typography } = useTheme();

  const background =
    tone === 'success'
      ? colors.secondaryContainer
      : tone === 'danger'
        ? colors.errorContainer
        : tone === 'pending'
          ? colors.tertiaryContainer
          : colors.surfaceContainerHigh;

  const foreground =
    tone === 'success'
      ? colors.secondary
      : tone === 'danger'
        ? colors.error
        : tone === 'pending'
          ? colors.tertiary
          : colors.onSurfaceVariant;

  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: background,
          borderRadius: shape.full,
          paddingHorizontal: spacing.sm,
          paddingVertical: 2,
        },
      ]}
    >
      <Text style={[typography.labelSmall, { color: foreground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { alignSelf: 'flex-start' },
});
