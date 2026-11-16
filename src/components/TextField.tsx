import React from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';

interface TextFieldProps extends TextInputProps {
  label?: string;
  hint?: string;
  error?: string | null;
}

export function TextField({ label, hint, error, style, ...rest }: TextFieldProps) {
  const { colors, shape, spacing, typography } = useTheme();

  return (
    <View style={{ marginBottom: spacing.lg }}>
      {label ? (
        <Text
          style={[
            typography.bodySmall,
            { color: colors.onSurfaceVariant, marginBottom: spacing.xs },
          ]}
        >
          {label}
        </Text>
      ) : null}

      <TextInput
        placeholderTextColor={colors.outline}
        style={[
          typography.bodyLarge,
          styles.input,
          {
            backgroundColor: colors.surfaceContainerLow,
            color: colors.onSurface,
            borderColor: error ? colors.error : colors.outlineVariant,
            borderRadius: shape.md,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.md,
          },
          style,
        ]}
        {...rest}
      />

      {error ? (
        <Text
          style={[typography.bodySmall, { color: colors.error, marginTop: spacing.xs }]}
        >
          {error}
        </Text>
      ) : hint ? (
        <Text
          style={[typography.bodySmall, { color: colors.outline, marginTop: spacing.xs }]}
        >
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 48,
  },
});
