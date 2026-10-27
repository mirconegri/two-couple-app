import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../theme/ThemeProvider';
import { PressableScale } from './PressableScale';

interface ListRowProps {
  label: string;
  value?: string | null;
  icon?: keyof typeof Ionicons.glyphMap;
  iconBg?: string;
  iconColor?: string;
  chevron?: boolean;
  onPress?: () => void;
  rightAction?: React.ReactNode;
  destructive?: boolean;
  disabled?: boolean;
}

export function ListRow({
  label,
  value,
  icon,
  iconBg,
  iconColor = '#FFFFFF',
  chevron = false,
  onPress,
  rightAction,
  destructive = false,
  disabled = false,
}: ListRowProps) {
  const { colors, radii, spacing, typography } = useTheme();

  const isInteractive = Boolean(onPress) && !disabled;

  const content = (
    <View style={[styles.row, { paddingHorizontal: spacing.lg, paddingVertical: spacing.md }]}>
      {icon ? (
        <View
          style={[
            styles.iconWrap,
            {
              backgroundColor: iconBg ?? colors.accent,
              borderRadius: radii.sm,
              marginRight: spacing.md,
            },
          ]}
        >
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
      ) : null}

      <Text
        style={[
          typography.body,
          styles.label,
          {
            color: destructive ? colors.danger : colors.text,
            flex: 1,
          },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>

      {value !== undefined && value !== null ? (
        <Text
          style={[
            typography.body,
            styles.value,
            {
              color: colors.textMuted,
              marginRight: chevron ? spacing.xs : 0,
            },
          ]}
          numberOfLines={1}
        >
          {value}
        </Text>
      ) : null}

      {rightAction ? (
        <View style={chevron ? { marginRight: spacing.xs } : undefined}>
          {rightAction}
        </View>
      ) : null}

      {chevron ? (
        <Ionicons name="chevron-forward" size={17} color={colors.textFaint} />
      ) : null}
    </View>
  );

  if (!isInteractive) {
    return content;
  }

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      scaleTo={0.98}
      haptics="selection"
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {content}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 46,
  },
  iconWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    letterSpacing: -0.4,
  },
  value: {
    letterSpacing: -0.4,
  },
});
