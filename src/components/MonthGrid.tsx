import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { isSameDay, isToday } from 'date-fns';

import { buildMonthGrid, toDateKey, WEEKDAY_LABELS } from '../utils/date';
import { useTheme } from '../theme/ThemeProvider';
import type { CalendarEvent } from '../types';
import { eventDateKey } from '../utils/date';
import { PressableScale } from './PressableScale';
import { duration, spring } from '../theme/motion';

interface MonthGridProps {
  anchor: Date;
  selected: Date;
  events: readonly CalendarEvent[];
  onSelectDate: (date: Date) => void;
}

function DayCell({
  cellDate,
  inMonth,
  isSelected,
  today,
  dayEvents,
  onPress,
}: {
  cellDate: Date;
  inMonth: boolean;
  isSelected: boolean;
  today: boolean;
  dayEvents: CalendarEvent[];
  onPress: () => void;
}) {
  const { colors, radii, spacing, typography } = useTheme();
  const scale = useSharedValue(1);
  const todayPulse = useSharedValue(1);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (isSelected && !reducedMotion) {
      scale.value = withSequence(
        withSpring(1.14, spring.pop),
        withSpring(1, spring.pop),
      );
    }
  }, [isSelected, reducedMotion, scale]);

  useEffect(() => {
    if (today && !isSelected && !reducedMotion) {
      todayPulse.value = withSequence(
        withTiming(1.12, { duration: 350 }),
        withTiming(1, { duration: 350 }),
      );
    }
  }, [today, isSelected, reducedMotion, todayPulse]);

  const animatedStyle = useAnimatedStyle(() => {
    const currentScale = isSelected ? scale.value : (today && !isSelected ? todayPulse.value : 1);
    return {
      transform: [{ scale: currentScale }],
    };
  });

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${cellDate.toDateString()}, ${dayEvents.length} events`}
      haptics="selection"
      scaleTo={0.92}
      style={[styles.cell, { padding: spacing.xxs }]}
    >
      <Animated.View
        style={[
          styles.cellInner,
          {
            borderRadius: radii.md,
            backgroundColor: isSelected ? colors.accent : 'transparent',
            borderWidth: today && !isSelected ? StyleSheet.hairlineWidth : 0,
            borderColor: colors.accent,
          },
          animatedStyle,
        ]}
      >
        <Text
          style={[
            typography.caption,
            {
              color: isSelected
                ? colors.onAccent
                : inMonth
                  ? colors.text
                  : colors.textFaint,
              fontWeight: today ? '700' : '500',
            },
          ]}
        >
          {cellDate.getDate()}
        </Text>

        <View style={styles.dotRow}>
          {dayEvents.slice(0, 3).map((event, index) => (
            <Animated.View
              key={event.id}
              entering={FadeIn.delay(index * 20).duration(duration.fast)}
              style={[
                styles.dot,
                {
                  backgroundColor: isSelected
                    ? 'rgba(255,255,255,0.85)'
                    : event.color ?? colors.accent,
                },
              ]}
            />
          ))}
        </View>
      </Animated.View>
    </PressableScale>
  );
}

export function MonthGrid({ anchor, selected, events, onSelectDate }: MonthGridProps) {
  const { colors, typography } = useTheme();

  const cells = buildMonthGrid(anchor);

  const eventsByDay = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    if (event.deletedAt) continue;
    const key = eventDateKey(event);
    if (!key) continue;
    const bucket = eventsByDay.get(key);
    if (bucket) bucket.push(event);
    else eventsByDay.set(key, [event]);
  }

  return (
    <View>
      <View style={styles.weekRow}>
        {WEEKDAY_LABELS.map((label, index) => (
          <View key={`${label}-${index}`} style={styles.weekCell}>
            <Text style={[typography.micro, { color: colors.textFaint }]}>{label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((cell) => {
          const key = toDateKey(cell.date);
          const dayEvents = eventsByDay.get(key) ?? [];
          const isSelected = isSameDay(cell.date, selected);
          const today = isToday(cell.date);

          return (
            <DayCell
              key={cell.key}
              cellDate={cell.date}
              inMonth={cell.inMonth}
              isSelected={isSelected}
              today={today}
              dayEvents={dayEvents}
              onPress={() => onSelectDate(cell.date)}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekCell: { flex: 1, alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1 },
  cellInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dotRow: { flexDirection: 'row', gap: 2, marginTop: 2, height: 4 },
  dot: { width: 4, height: 4, borderRadius: 2 },
});
