import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { isSameDay, isToday } from 'date-fns';

import { buildMonthGrid, toDateKey, WEEKDAY_LABELS } from '../utils/date';
import { useTheme } from '../theme/ThemeProvider';
import type { CalendarEvent } from '../types';
import { eventDateKey } from '../utils/date';

interface MonthGridProps {
  anchor: Date;
  selected: Date;
  events: readonly CalendarEvent[];
  onSelectDate: (date: Date) => void;
}

export function MonthGrid({ anchor, selected, events, onSelectDate }: MonthGridProps) {
  const { colors, radii, spacing, typography } = useTheme();

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
            <Pressable
              key={cell.key}
              onPress={() => onSelectDate(cell.date)}
              accessibilityRole="button"
              accessibilityLabel={`${cell.date.toDateString()}, ${dayEvents.length} events`}
              style={[styles.cell, { padding: spacing.xxs }]}
            >
              <View
                style={[
                  styles.cellInner,
                  {
                    borderRadius: radii.md,
                    backgroundColor: isSelected ? colors.accent : 'transparent',
                    borderWidth: today && !isSelected ? StyleSheet.hairlineWidth : 0,
                    borderColor: colors.accent,
                  },
                ]}
              >
                <Text
                  style={[
                    typography.caption,
                    {
                      color: isSelected
                        ? colors.onAccent
                        : cell.inMonth
                          ? colors.text
                          : colors.textFaint,
                      fontWeight: today ? '700' : '500',
                    },
                  ]}
                >
                  {cell.date.getDate()}
                </Text>

                <View style={styles.dotRow}>
                  {dayEvents.slice(0, 3).map((event) => (
                    <View
                      key={event.id}
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
              </View>
            </Pressable>
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
