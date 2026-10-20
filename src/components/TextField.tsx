import React from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';

interface TextFieldProps extends TextInputProps {
  label?: string;
  hint?: string;
  error?: string | null;
}

export function TextField({ label, hint, error, style, ...rest }: TextFieldProps) {
  const { colors, radii, spacing, typography } = useTheme();

  return (
    <View style={{ marginBottom: spacing.lg }}>
      {label ? (
        <Text
          style={[
            typography.caption,
            { color: colors.textMuted, marginBottom: spacing.xs },
          ]}
        >
          {label}
        </Text>
      ) : null}

      <TextInput
        placeholderTextColor={colors.textFaint}
        style={[
          typography.body,
          styles.input,
          {
            backgroundColor: colors.surface,
            color: colors.text,
            borderColor: error ? colors.danger : colors.border,
            borderRadius: radii.md,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.md,
          },
          style,
        ]}
        {...rest}
      />

      {error ? (
        <Text
          style={[typography.caption, { color: colors.danger, marginTop: spacing.xs }]}
        >
          {error}
        </Text>
      ) : hint ? (
        <Text
          style={[typography.caption, { color: colors.textFaint, marginTop: spacing.xs }]}
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
