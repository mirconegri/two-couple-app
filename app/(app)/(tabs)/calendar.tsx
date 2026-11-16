import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { addDays, format, isSameDay, isSameMonth, startOfMonth } from 'date-fns';
import Animated, { FadeIn, Keyframe } from 'react-native-reanimated';

import { Screen } from '../../../src/components/Screen';
import { MonthGrid } from '../../../src/components/MonthGrid';
import { EventRow } from '../../../src/components/EventRow';
import { EmptyState } from '../../../src/components/EmptyState';
import { Button } from '../../../src/components/Button';
import { Text } from '../../../src/components/Text';
import { TopAppBar } from '../../../src/components/TopAppBar';
import { IconButton } from '../../../src/components/IconButton';
import { SegmentedButton } from '../../../src/components/SegmentedButton';
import { Fab } from '../../../src/components/Fab';
import { useEvents } from '../../../src/hooks/useEvents';
import { useSettings } from '../../../src/settings/SettingsProvider';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { eventDateKey, parseDateKey, shiftMonth, toDateKey } from '../../../src/utils/date';
import { duration } from '../../../src/theme/motion';
import { spacing } from '../../../src/theme/tokens';

const AGENDA_DAYS = 60;

export default function CalendarScreen() {
  const { reducedMotion } = useTheme();
  const { settings, update } = useSettings();
  const { events } = useEvents();

  const [anchor, setAnchor] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState(() => new Date());
  const [direction, setDirection] = useState<-1 | 1>(1);

  const selectedKey = toDateKey(selected);
  const view = settings.calendarDefaultView;

  const dayEvents = useMemo(
    () => events.filter((event) => !event.deletedAt && eventDateKey(event) === selectedKey),
    [events, selectedKey],
  );

  const agenda = useMemo(() => {
    const today = toDateKey(new Date());
    const horizon = toDateKey(addDays(new Date(), AGENDA_DAYS));
    return events
      .filter((event) => !event.deletedAt)
      .map((event) => ({ event, key: eventDateKey(event) }))
      .filter(({ key }) => key && key >= today && key <= horizon)
      .sort((a, b) => a.key.localeCompare(b.key));
  }, [events]);

  const agendaGroups = useMemo(() => {
    const groups = new Map<string, typeof agenda>();
    for (const item of agenda) {
      const bucket = groups.get(item.key);
      if (bucket) bucket.push(item);
      else groups.set(item.key, [item]);
    }
    return [...groups.entries()];
  }, [agenda]);

  const goToToday = () => {
    const today = new Date();
    setAnchor(startOfMonth(today));
    setSelected(today);
  };

  const step = (delta: -1 | 1) => {
    setDirection(delta);
    setAnchor((current) => shiftMonth(current, delta));
  };

  const monthTransition = useMemo(() => {
    if (reducedMotion) return FadeIn.duration(duration.short3);
    const startX = direction > 0 ? 24 : -24;
    return new Keyframe({
      0: { transform: [{ translateX: startX }], opacity: 0 },
      100: { transform: [{ translateX: 0 }], opacity: 1 },
    }).duration(duration.medium1);
  }, [direction, reducedMotion]);

  const newEvent = (date?: string) =>
    router.push({ pathname: '/(app)/event/new', params: date ? { date } : {} });

  return (
    <View style={styles.root}>
      <TopAppBar
        title="Calendar"
        actions={
          <IconButton
            icon="today-outline"
            onPress={goToToday}
            accessibilityLabel="Go to today"
          />
        }
      />

      <Screen scroll contentStyle={styles.content}>
        <SegmentedButton
          options={[
            { value: 'month', label: 'Month' },
            { value: 'agenda', label: 'Agenda' },
          ]}
          value={view}
          onChange={(calendarDefaultView) => update({ calendarDefaultView })}
        />

        {view === 'month' ? (
          <>
            <View style={styles.monthHeader}>
              <Text variant="titleLarge" strong>
                {format(anchor, 'MMMM yyyy')}
              </Text>
              <View style={styles.monthActions}>
                <IconButton
                  icon="chevron-back"
                  variant="tonal"
                  size="sm"
                  onPress={() => step(-1)}
                  accessibilityLabel="Previous month"
                />
                <IconButton
                  icon="chevron-forward"
                  variant="tonal"
                  size="sm"
                  onPress={() => step(1)}
                  accessibilityLabel="Next month"
                />
              </View>
            </View>

            <Animated.View key={anchor.toISOString()} entering={monthTransition}>
              <MonthGrid
                anchor={anchor}
                selected={selected}
                weekStartsOn={settings.calendarStartDay}
                events={events}
                onSelectDate={(date) => {
                  setSelected(date);
                  if (!isSameMonth(date, anchor)) {
                    setDirection(date > anchor ? 1 : -1);
                    setAnchor(startOfMonth(date));
                  }
                }}
              />
            </Animated.View>

            <View style={styles.sectionRow}>
              <Text variant="titleMedium" strong>
                {isSameDay(selected, new Date()) ? 'Today' : format(selected, 'd MMMM')}
              </Text>
              <Button label="Add" icon="add" variant="text" onPress={() => newEvent(selectedKey)} />
            </View>

            {dayEvents.length === 0 ? (
              <EmptyState
                icon="calendar-clear-outline"
                title="Nothing on this day"
                description="Add something, or pick another date."
              />
            ) : (
              <View style={styles.list}>
                {dayEvents.map((event) => (
                  <EventRow
                    key={event.id}
                    event={event}
                    onPress={() => router.push(`/(app)/event/${event.id}`)}
                  />
                ))}
              </View>
            )}
          </>
        ) : agendaGroups.length === 0 ? (
          <EmptyState
            icon="calendar-outline"
            title="Nothing coming up"
            description={`No events in the next ${AGENDA_DAYS} days.`}
          />
        ) : (
          agendaGroups.map(([key, items], groupIndex) => {
            const date = parseDateKey(key);
            return (
              <Animated.View
                key={key}
                entering={FadeIn.duration(duration.short4).delay(
                  reducedMotion ? 0 : Math.min(groupIndex, 6) * 30,
                )}
                style={styles.group}
              >
                <Text variant="titleSmall" color="primary" style={styles.groupLabel}>
                  {isSameDay(date, new Date())
                    ? 'Today'
                    : format(date, 'EEEE d MMMM').toUpperCase()}
                </Text>
                <View style={styles.list}>
                  {items.map(({ event }) => (
                    <EventRow
                      key={event.id}
                      event={event}
                      onPress={() => router.push(`/(app)/event/${event.id}`)}
                    />
                  ))}
                </View>
              </Animated.View>
            );
          })
        )}
      </Screen>

      <Fab
        icon="add"
        label="Event"
        onPress={() => newEvent(view === 'month' ? selectedKey : undefined)}
        accessibilityLabel="New event"
        style={styles.fab}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingTop: spacing.lg, paddingBottom: 96 },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  monthActions: { flexDirection: 'row', gap: spacing.sm },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  list: { gap: spacing.sm },
  group: { marginBottom: spacing.lg },
  groupLabel: { marginBottom: spacing.sm },
  fab: { position: 'absolute', right: spacing.lg, bottom: spacing.lg },
});
