import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../theme/ThemeProvider';

interface NavBarButtonProps {
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  bold?: boolean;
  disabled?: boolean;
  destructive?: boolean;
}

export function NavBarButton({
  label,
  icon,
  onPress,
  bold = false,
  disabled = false,
  destructive = false,
}: NavBarButtonProps) {
  const { colors, typography, spacing } = useTheme();

  const tint = destructive
    ? colors.danger
    : disabled
      ? colors.textFaint
      : colors.accent;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={10}
      style={({ pressed }) => [
        styles.button,
        { opacity: pressed ? 0.6 : 1 },
      ]}
    >
      {icon ? <Ionicons name={icon} size={22} color={tint} /> : null}
      {label ? (
        <Text
          style={[
            bold ? typography.headline : typography.body,
            { color: tint, marginLeft: icon ? spacing.xs : 0 },
          ]}
        >
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
});
