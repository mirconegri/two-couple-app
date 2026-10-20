import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { format, isSameDay, isSameMonth, startOfMonth } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '../../../src/components/Screen';
import { MonthGrid } from '../../../src/components/MonthGrid';
import { EventRow } from '../../../src/components/EventRow';
import { EmptyState } from '../../../src/components/EmptyState';
import { Button } from '../../../src/components/Button';
import { useEvents } from '../../../src/hooks/useEvents';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { eventDateKey, shiftMonth, toDateKey } from '../../../src/utils/date';
import type { CalendarEvent } from '../../../src/types';

export default function CalendarScreen() {
  const { colors, spacing, typography, radii } = useTheme();
  const { events } = useEvents();

  const [anchor, setAnchor] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState(() => new Date());

  const selectedKey = toDateKey(selected);

  const dayEvents = useMemo(
    () =>
      events.filter((event) => !event.deletedAt && eventDateKey(event) === selectedKey),
    [events, selectedKey],
  );

  const monthEvents = useMemo(
    () => events.filter((event) => !event.deletedAt),
    [events],
  );

  const goToToday = () => {
    const today = new Date();
    setAnchor(startOfMonth(today));
    setSelected(today);
  };

  return (
    <Screen scroll>
      <View style={{ paddingTop: spacing.lg }}>
        <View style={styles.headerRow}>
          <Text style={[typography.title, { color: colors.text }]}>
            {format(anchor, 'MMMM yyyy')}
          </Text>

          <View style={styles.headerActions}>
            <Pressable
              onPress={() => setAnchor((current) => shiftMonth(current, -1))}
              hitSlop={8}
              accessibilityLabel="Previous month"
              style={[styles.navButton, { backgroundColor: colors.surfaceMuted, borderRadius: radii.sm }]}
            >
              <Ionicons name="chevron-back" size={18} color={colors.text} />
            </Pressable>

            <Pressable
              onPress={() => setAnchor((current) => shiftMonth(current, 1))}
              hitSlop={8}
              accessibilityLabel="Next month"
              style={[styles.navButton, { backgroundColor: colors.surfaceMuted, borderRadius: radii.sm }]}
            >
              <Ionicons name="chevron-forward" size={18} color={colors.text} />
            </Pressable>
          </View>
        </View>

        <Pressable onPress={goToToday} hitSlop={8} style={{ marginBottom: spacing.md }}>
          <Text style={[typography.caption, { color: colors.accent }]}>Today</Text>
        </Pressable>

        <MonthGrid
          anchor={anchor}
          selected={selected}
          events={monthEvents}
          onSelectDate={(date) => {
            setSelected(date);
            if (!isSameMonth(date, anchor)) setAnchor(startOfMonth(date));
          }}
        />

        <View style={{ marginTop: spacing.xl }}>
          <View style={styles.sectionRow}>
            <Text style={[typography.heading, { color: colors.text }]}>
              {isSameDay(selected, new Date()) ? 'Today' : format(selected, 'd MMMM')}
            </Text>

            <Button
              label="Add"
              onPress={() =>
                router.push({
                  pathname: '/(app)/event/new',
                  params: { date: selectedKey },
                })
              }
              fullWidth={false}
              style={{ paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, minHeight: 36 }}
            />
          </View>

          {dayEvents.length === 0 ? (
            <EmptyState
              icon="calendar-clear-outline"
              title="Nothing on this day"
              description="Add something, or pick another date."
            />
          ) : (
            dayEvents.map((event: CalendarEvent) => (
              <EventRow
                key={event.id}
                event={event}
                onPress={() => router.push(`/(app)/event/${event.id}`)}
              />
            ))
          )}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  headerActions: { flexDirection: 'row', gap: 8 },
  navButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
});
