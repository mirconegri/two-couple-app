import React, { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '../theme/ThemeProvider';
import { shape, spacing } from '../theme/tokens';
import { spring } from '../theme/motion';
import { Text } from './Text';

export interface TextFieldProps extends TextInputProps {
  label: string;
  hint?: string;
  error?: string | null;
  /** Surface the field sits on, so the floating label can mask the outline. */
  background?: string;
}

/** Material 3 outlined text field with a floating label. */
export function TextField({
  label,
  hint,
  error,
  background,
  style,
  onFocus,
  onBlur,
  ...rest
}: TextFieldProps) {
  const { colors, reducedMotion, typography } = useTheme();
  const [focused, setFocused] = useState(false);
  const floated = useSharedValue(rest.value ? 1 : 0);
  const mask = background ?? colors.surface;

  const float = focused || Boolean(rest.value);

  useEffect(() => {
    const next = float ? 1 : 0;
    floated.value = reducedMotion ? next : withSpring(next, spring.effectsDefault);
  }, [float, floated, reducedMotion]);

  const labelStyle = useAnimatedStyle(() => ({
    top: interpolate(floated.value, [0, 1], [17, -9]),
    fontSize: interpolate(floated.value, [0, 1], [16, 12]),
    color: interpolateColor(
      floated.value,
      [0, 1],
      [
        colors.onSurfaceVariant,
        error ? colors.error : focused ? colors.primary : colors.onSurfaceVariant,
      ],
    ),
  }));

  const borderStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      floated.value,
      [0, 1],
      [colors.outline, error ? colors.error : focused ? colors.primary : colors.outline],
    ),
    borderWidth: withTiming(focused || Boolean(error) ? 2 : 1),
  }));

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.container, borderStyle]}>
        <Animated.Text
          numberOfLines={1}
          pointerEvents="none"
          style={[typography.bodyLarge, styles.label, { backgroundColor: mask }, labelStyle]}
        >
          {label}
        </Animated.Text>
        <TextInput
          {...rest}
          placeholderTextColor={colors.outline}
          selectionColor={colors.primary}
          cursorColor={colors.primary}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[typography.bodyLarge, styles.input, { color: colors.onSurface }, style]}
        />
      </Animated.View>

      {error ? (
        <Text variant="bodySmall" color="error" style={styles.supporting}>
          {error}
        </Text>
      ) : hint ? (
        <Text variant="bodySmall" color="onSurfaceVariant" style={styles.supporting}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  container: { height: 56, borderRadius: shape.md, justifyContent: 'center' },
  label: { position: 'absolute', left: spacing.md, paddingHorizontal: spacing.xs },
  input: { paddingHorizontal: spacing.lg, paddingVertical: 0, height: '100%' },
  supporting: { marginTop: spacing.xs, marginLeft: spacing.lg },
});
