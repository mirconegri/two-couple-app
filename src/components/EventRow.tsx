import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { CalendarEvent } from '../types';
import { formatEventRange } from '../utils/date';
import { useTheme } from '../theme/ThemeProvider';

interface EventRowProps {
  event: CalendarEvent;
  onPress: (event: CalendarEvent) => void;
  creatorLabel?: string;
}

export function EventRow({ event, onPress, creatorLabel }: EventRowProps) {
  const { colors, radii, spacing, typography } = useTheme();

  return (
    <Pressable
      onPress={() => onPress(event)}
      accessibilityRole="button"
      accessibilityLabel={`${event.title}, ${formatEventRange(event)}`}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed ? colors.surfaceMuted : 'transparent',
          borderRadius: radii.md,
          paddingVertical: spacing.sm + 2,
          paddingHorizontal: spacing.sm,
        },
      ]}
    >
      <View
        style={[
          styles.stripe,
          {
            backgroundColor: event.color ?? colors.accent,
            borderRadius: radii.pill,
          },
        ]}
      />

      <View style={{ flex: 1, marginLeft: spacing.md }}>
        <Text numberOfLines={1} style={[typography.bodyStrong, { color: colors.text }]}>
          {event.title}
        </Text>

        <Text
          numberOfLines={1}
          style={[typography.caption, { color: colors.textMuted, marginTop: 1 }]}
        >
          {formatEventRange(event)}
          {event.location ? ` · ${event.location}` : ''}
        </Text>
      </View>

      {event.visibility === 'private' ? (
        <Ionicons name="lock-closed-outline" size={14} color={colors.textFaint} />
      ) : creatorLabel ? (
        <Text style={[typography.micro, { color: colors.textFaint }]}>{creatorLabel}</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  stripe: { width: 3, alignSelf: 'stretch', minHeight: 32 },
});
