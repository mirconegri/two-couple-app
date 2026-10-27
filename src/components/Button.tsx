import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useTheme } from '../theme/ThemeProvider';
import { PressableScale } from './PressableScale';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  fullWidth?: boolean;
  haptics?: 'light' | 'selection' | null;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  style,
  fullWidth = true,
  haptics,
}: ButtonProps) {
  const { colors, radii, spacing, typography } = useTheme();
  const isDisabled = disabled || loading;

  const defaultHaptics =
    variant === 'primary' || variant === 'danger' ? 'light' : 'selection';

  const background =
    variant === 'primary'
      ? colors.accent
      : variant === 'danger'
        ? colors.danger
        : variant === 'secondary'
          ? colors.surfaceMuted
          : 'transparent';

  const textColor =
    variant === 'primary' || variant === 'danger'
      ? colors.onAccent
      : variant === 'ghost'
        ? colors.accent
        : colors.text;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      onPress={onPress}
      disabled={isDisabled}
      haptics={haptics ?? defaultHaptics}
      scaleTo={0.97}
      style={[
        styles.base,
        {
          backgroundColor: background,
          borderRadius: radii.md,
          paddingVertical: spacing.md + 2,
          paddingHorizontal: spacing.lg,
          opacity: isDisabled ? 0.45 : 1,
          borderWidth: variant === 'secondary' ? StyleSheet.hairlineWidth : 0,
          borderColor: colors.border,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        style,
      ]}
    >
      {loading ? (
        <Animated.View entering={FadeIn.duration(150)}>
          <ActivityIndicator color={textColor} />
        </Animated.View>
      ) : (
        <View style={styles.row}>
          {icon ? <View style={{ marginRight: spacing.sm }}>{icon}</View> : null}
          <Text style={[typography.headline, { color: textColor }]}>{label}</Text>
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
});
