import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { CalendarEvent } from '../types';
import { formatEventRange } from '../utils/date';
import { useTheme } from '../theme/ThemeProvider';
import { useSettings } from '../settings/SettingsProvider';
import { iconSize, shape, spacing } from '../theme/tokens';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export interface EventRowProps {
  event: CalendarEvent;
  onPress: (event: CalendarEvent) => void;
  creatorLabel?: string;
}

export function EventRow({ event, onPress, creatorLabel }: EventRowProps) {
  const { colors } = useTheme();
  const { settings } = useSettings();
  const when = formatEventRange(event, settings.use24Hour);

  return (
    <PressableScale
      onPress={() => onPress(event)}
      accessibilityRole="button"
      accessibilityLabel={`${event.title}, ${when}`}
      scaleTo={0.98}
      haptics="selection"
      rippleRadius={shape.md}
      style={[styles.row, { backgroundColor: colors.surfaceContainerLow }]}
    >
      <View style={[styles.stripe, { backgroundColor: event.color ?? colors.primary }]} />

      <View style={styles.labels}>
        <Text variant="titleMedium" numberOfLines={1}>
          {event.title}
        </Text>
        <Text variant="bodySmall" color="onSurfaceVariant" numberOfLines={1}>
          {when}
          {event.location ? ` · ${event.location}` : ''}
        </Text>
      </View>

      {event.visibility === 'private' ? (
        <Ionicons name="lock-closed" size={iconSize.sm} color={colors.onSurfaceVariant} />
      ) : creatorLabel ? (
        <Text variant="labelMedium" color="onSurfaceVariant">
          {creatorLabel}
        </Text>
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: shape.md,
    overflow: 'hidden',
  },
  stripe: { width: 4, alignSelf: 'stretch', minHeight: 32, borderRadius: shape.full },
  labels: { flex: 1, gap: 2 },
});
