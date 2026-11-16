import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { shape, spacing } from '../theme/tokens';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export interface ListSectionProps {
  title?: string;
  footer?: string;
  children: React.ReactNode;
}

export function ListSection({ title, footer, children }: ListSectionProps) {
  const { colors } = useTheme();
  const rows = React.Children.toArray(children).filter(Boolean);

  return (
    <View style={styles.wrap}>
      {title ? (
        <Text variant="titleSmall" color="primary" style={styles.title}>
          {title}
        </Text>
      ) : null}

      <View style={[styles.container, { backgroundColor: colors.surfaceContainerLow }]}>
        {rows.map((row, index) => (
          <React.Fragment key={index}>
            {row}
            {index < rows.length - 1 ? (
              <View style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />
            ) : null}
          </React.Fragment>
        ))}
      </View>

      {footer ? (
        <Text variant="bodySmall" color="onSurfaceVariant" style={styles.footer}>
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', marginBottom: spacing.xl },
  title: { paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  container: { borderRadius: shape.lg, overflow: 'hidden' },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: spacing.lg },
  footer: { paddingHorizontal: spacing.lg, marginTop: spacing.sm },
});
