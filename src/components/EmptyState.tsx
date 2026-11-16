import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../theme/ThemeProvider';
import { iconSize, shape, spacing } from '../theme/tokens';
import { Text } from './Text';

export interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrap}>
      <View style={[styles.icon, { backgroundColor: colors.secondaryContainer }]}>
        <Ionicons name={icon} size={iconSize.lg} color={colors.onSecondaryContainer} />
      </View>
      <Text variant="titleMedium" style={styles.title}>
        {title}
      </Text>
      {description ? (
        <Text variant="bodyMedium" color="onSurfaceVariant" style={styles.description}>
          {description}
        </Text>
      ) : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  icon: {
    width: 64,
    height: 64,
    borderRadius: shape.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: { textAlign: 'center' },
  description: { textAlign: 'center', marginTop: spacing.xs },
  action: { marginTop: spacing.lg },
});
