import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { isSameDay, isToday } from 'date-fns';

import { buildMonthGrid, eventDateKey, toDateKey, weekdayLabels, type WeekStart } from '../utils/date';
import { useTheme } from '../theme/ThemeProvider';
import type { CalendarEvent } from '../types';
import { PressableScale } from './PressableScale';
import { Text } from './Text';
import { shape, spacing } from '../theme/tokens';
import { duration, spring } from '../theme/motion';

export interface MonthGridProps {
  anchor: Date;
  selected: Date;
  weekStartsOn: WeekStart;
  events: readonly CalendarEvent[];
  onSelectDate: (date: Date) => void;
}

interface DayCellProps {
  cellDate: Date;
  inMonth: boolean;
  isSelected: boolean;
  isToday: boolean;
  dayEvents: CalendarEvent[];
  onPress: () => void;
}

function DayCell({
  cellDate,
  inMonth,
  isSelected,
  isToday: today,
  dayEvents,
  onPress,
}: DayCellProps) {
  const { colors, reducedMotion } = useTheme();
  const scale = useSharedValue(1);

  React.useEffect(() => {
    if (isSelected && !reducedMotion) {
      scale.value = withSpring(1.12, spring.spatialFast);
    } else {
      scale.value = withSpring(1, spring.spatialFast);
    }
  }, [isSelected, reducedMotion, scale]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${cellDate.toDateString()}, ${dayEvents.length} events`}
      accessibilityState={{ selected: isSelected }}
      haptics="selection"
      rippleRadius={shape.full}
      style={styles.cell}
    >
      <Animated.View
        style={[
          styles.cellInner,
          {
            backgroundColor: isSelected
              ? colors.primary
              : today
                ? colors.primaryContainer
                : 'transparent',
          },
          animatedStyle,
        ]}
      >
        <Text
          variant="bodyMedium"
          strong={today || isSelected}
          style={{
            color: isSelected
              ? colors.onPrimary
              : inMonth
                ? colors.onSurface
                : colors.onSurfaceVariant,
            opacity: inMonth || isSelected ? 1 : 0.5,
          }}
        >
          {cellDate.getDate()}
        </Text>

        <View style={styles.dotRow}>
          {dayEvents.slice(0, 3).map((event, index) => (
            <Animated.View
              key={event.id}
              entering={FadeIn.delay(index * 20).duration(duration.short3)}
              style={[
                styles.dot,
                {
                  backgroundColor: isSelected
                    ? colors.onPrimary
                    : (event.color ?? colors.primary),
                },
              ]}
            />
          ))}
        </View>
      </Animated.View>
    </PressableScale>
  );
}

export function MonthGrid({ anchor, selected, weekStartsOn, events, onSelectDate }: MonthGridProps) {
  const { colors } = useTheme();
  const cells = buildMonthGrid(anchor, weekStartsOn);

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
        {weekdayLabels(weekStartsOn).map((label, index) => (
          <View key={`${label}-${index}`} style={styles.weekCell}>
            <Text variant="labelSmall" color="onSurfaceVariant">
              {label}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((cell) => (
          <DayCell
            key={cell.key}
            cellDate={cell.date}
            inMonth={cell.inMonth}
            isSelected={isSameDay(cell.date, selected)}
            isToday={isToday(cell.date)}
            dayEvents={eventsByDay.get(toDateKey(cell.date)) ?? []}
            onPress={() => onSelectDate(cell.date)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  weekRow: { flexDirection: 'row', marginBottom: spacing.xs },
  weekCell: { flex: 1, alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 2 },
  cellInner: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: shape.full },
  dotRow: { flexDirection: 'row', gap: 2, marginTop: 2, height: 4 },
  dot: { width: 4, height: 4, borderRadius: shape.full },
});
