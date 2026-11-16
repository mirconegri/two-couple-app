import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { spacing } from '../theme/tokens';
import { LoadingIndicator } from './LoadingIndicator';
import { Text } from './Text';

export interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message }: LoadingScreenProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.wrap, { backgroundColor: colors.surface }]}>
      <LoadingIndicator size={40} />
      {message ? (
        <Text variant="bodyMedium" color="onSurfaceVariant" style={styles.message}>
          {message}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  message: { marginTop: spacing.lg },
});
