import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeInUp,
  ZoomIn,
  useReducedMotion,
} from 'react-native-reanimated';

import { useTheme } from '../theme/ThemeProvider';
import { duration, spring } from '../theme/motion';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon = 'sparkles-outline',
  title,
  description,
  action,
}: EmptyStateProps) {
  const { colors, spacing, typography } = useTheme();
  const reducedMotion = useReducedMotion();

  return (
    <View style={[styles.wrap, { padding: spacing.xxl }]}>
      <Animated.View
        entering={
          reducedMotion
            ? FadeIn.duration(duration.short3)
            : ZoomIn.springify()
                .damping(spring.spatialFast.damping)
                .stiffness(spring.spatialFast.stiffness)
        }
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: colors.primaryContainer,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing.lg,
        }}
      >
        <Ionicons name={icon} size={26} color={colors.primary} />
      </Animated.View>

      <Animated.View
        entering={
          reducedMotion
            ? FadeIn.duration(duration.short3)
            : FadeInUp.delay(80).duration(duration.medium1)
        }
        style={{ alignItems: 'center' }}
      >
        <Text
          style={[
            typography.titleMedium,
            { color: colors.onSurface, textAlign: 'center', marginBottom: spacing.xs },
          ]}
        >
          {title}
        </Text>

        {description ? (
          <Text
            style={[
              typography.bodyLarge,
              {
                color: colors.onSurfaceVariant,
                textAlign: 'center',
                maxWidth: 300,
                marginBottom: spacing.lg,
              },
            ]}
          >
            {description}
          </Text>
        ) : null}
      </Animated.View>

      {action ? (
        <Animated.View
          entering={
            reducedMotion
              ? FadeIn.duration(duration.short3)
              : FadeInUp.delay(160).duration(duration.medium1)
          }
        >
          {action}
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
});
