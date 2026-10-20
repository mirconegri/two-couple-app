import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';

export function LoadingScreen({ label = 'Loading' }: { label?: string }) {
  const { colors, spacing, typography } = useTheme();

  return (
    <View style={[styles.wrap, { backgroundColor: colors.background }]}>
      <ActivityIndicator color={colors.accent} />
      <Text
        style={[
          typography.caption,
          { color: colors.textMuted, marginTop: spacing.md },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
