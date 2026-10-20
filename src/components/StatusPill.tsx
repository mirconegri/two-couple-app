import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';

type Tone = 'neutral' | 'pending' | 'success' | 'danger';

export function StatusPill({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const { colors, radii, spacing, typography } = useTheme();

  const background =
    tone === 'success'
      ? colors.successSoft
      : tone === 'danger'
        ? colors.dangerSoft
        : tone === 'pending'
          ? colors.warningSoft
          : colors.surfaceMuted;

  const foreground =
    tone === 'success'
      ? colors.success
      : tone === 'danger'
        ? colors.danger
        : tone === 'pending'
          ? colors.warning
          : colors.textMuted;

  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: background,
          borderRadius: radii.pill,
          paddingHorizontal: spacing.sm,
          paddingVertical: 2,
        },
      ]}
    >
      <Text style={[typography.micro, { color: foreground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { alignSelf: 'flex-start' },
});
