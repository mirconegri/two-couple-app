import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../theme/ThemeProvider';
import { iconSize, shape, spacing } from '../theme/tokens';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export interface ListRowProps {
  title: string;
  supporting?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Container behind the leading icon. Material list items usually omit it. */
  iconBackground?: string;
  iconColor?: string;
  value?: string;
  trailing?: React.ReactNode;
  chevron?: boolean;
  onPress?: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

export function ListRow({
  title,
  supporting,
  icon,
  iconBackground,
  iconColor,
  value,
  trailing,
  chevron = false,
  onPress,
  destructive = false,
  disabled = false,
}: ListRowProps) {
  const { colors } = useTheme();
  const tint = destructive ? colors.error : (iconColor ?? colors.onSurfaceVariant);

  const content = (
    <View style={styles.row}>
      {icon ? (
        <View
          style={[
            styles.leading,
            iconBackground ? { backgroundColor: iconBackground, borderRadius: shape.full } : null,
          ]}
        >
          <Ionicons name={icon} size={iconSize.md} color={iconBackground ? '#FFFFFF' : tint} />
        </View>
      ) : null}

      <View style={styles.labels}>
        <Text variant="bodyLarge" color={destructive ? 'error' : 'onSurface'} numberOfLines={1}>
          {title}
        </Text>
        {supporting ? (
          <Text variant="bodyMedium" color="onSurfaceVariant" numberOfLines={2}>
            {supporting}
          </Text>
        ) : null}
      </View>

      {value ? (
        <Text variant="bodyMedium" color="onSurfaceVariant" numberOfLines={1}>
          {value}
        </Text>
      ) : null}

      {trailing}

      {chevron ? (
        <Ionicons name="chevron-forward" size={iconSize.md} color={colors.onSurfaceVariant} />
      ) : null}
    </View>
  );

  if (!onPress || disabled) {
    return <View style={disabled ? styles.disabled : undefined}>{content}</View>;
  }

  return (
    <PressableScale
      onPress={onPress}
      haptics="selection"
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
    >
      {content}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  leading: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  labels: { flex: 1, gap: 2 },
  disabled: { opacity: 0.38 },
});
