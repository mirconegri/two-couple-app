import React, { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { format } from 'date-fns';

import { Screen } from './Screen';
import { TextField } from './TextField';
import { Button } from './Button';
import { useAuth } from '../auth/AuthProvider';
import { useSync } from '../sync/SyncProvider';
import { useTheme } from '../theme/ThemeProvider';
import { enqueueEvent } from '../db/events';
import { scheduleEventReminders } from '../notifications/reminders';
import { newId } from '../lib/id';
import { DEVICE_TIMEZONE, parseDateKey, toDateKey } from '../utils/date';
import { errorMessage } from '../utils/errors';
import type { CalendarEvent, EventVisibility } from '../types';

const REMINDER_OPTIONS = [
  { label: 'None', minutes: [] as number[] },
  { label: '10 min', minutes: [10] },
  { label: '1 hour', minutes: [60] },
  { label: '1 day', minutes: [1440] },
];

interface EventEditorProps {
  initialEvent?: CalendarEvent | null;
  defaultDate?: string;
}

export function EventEditor({ initialEvent, defaultDate }: EventEditorProps) {
  const db = useSQLiteContext();
  const { colors, spacing, typography, radii } = useTheme();
  const { coupleId, userId } = useAuth();
  const { notifyLocalChange } = useSync();

  const getInitialDateKey = () => {
    if (initialEvent) {
      if (initialEvent.allDay && initialEvent.startsOn) return initialEvent.startsOn;
      if (initialEvent.startsAt) return toDateKey(new Date(initialEvent.startsAt));
    }
    const parsed = defaultDate ? parseDateKey(defaultDate) : new Date();
    const safe = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
    return toDateKey(safe);
  };

  const getInitialTime = (timeStr: string | null | undefined, fallback: string) => {
    if (!timeStr) return fallback;
    try {
      return format(new Date(timeStr), 'HH:mm');
    } catch {
      return fallback;
    }
  };

  const [title, setTitle] = useState(initialEvent?.title ?? '');
  const [description, setDescription] = useState(initialEvent?.description ?? '');
  const [location, setLocation] = useState(initialEvent?.location ?? '');
  const [allDay, setAllDay] = useState(initialEvent?.allDay ?? true);
  const [dateKey, setDateKey] = useState(getInitialDateKey);
  const [startTime, setStartTime] = useState(() =>
    getInitialTime(initialEvent?.startsAt, '18:00'),
  );
  const [endTime, setEndTime] = useState(() =>
    getInitialTime(initialEvent?.endsAt, '19:00'),
  );
  const [visibility, setVisibility] = useState<EventVisibility>(
    initialEvent?.visibility ?? 'shared',
  );
  const [reminders, setReminders] = useState<number[]>(
    initialEvent?.reminderMinutes ?? [],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!coupleId || !userId) return;

    const trimmedTitle = title.trim();
    if (trimmedTitle.length === 0) {
      setError('Give the event a title');
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const now = new Date().toISOString();

      let startsOn: string | null = null;
      let endsOn: string | null = null;
      let startsAt: string | null = null;
      let endsAt: string | null = null;
      let timezone: string | null = null;

      if (allDay) {
        startsOn = dateKey;
        endsOn = dateKey;
      } else {
        const base = parseDateKey(dateKey);
        const [startHour, startMinute] = startTime.split(':').map(Number);
        const [endHour, endMinute] = endTime.split(':').map(Number);

        const start = new Date(base);
        start.setHours(startHour ?? 0, startMinute ?? 0, 0, 0);

        const end = new Date(base);
        end.setHours(endHour ?? 0, endMinute ?? 0, 0, 0);
        if (end <= start) end.setDate(end.getDate() + 1);

        startsAt = start.toISOString();
        endsAt = end.toISOString();
        timezone = DEVICE_TIMEZONE;
      }

      const event: CalendarEvent = {
        id: initialEvent?.id ?? newId(),
        coupleId,
        createdBy: initialEvent?.createdBy ?? userId,
        title: trimmedTitle,
        description: description.trim() || null,
        location: location.trim() || null,
        allDay,
        startsOn,
        endsOn,
        startsAt,
        endsAt,
        timezone,
        visibility,
        category: initialEvent?.category ?? null,
        color: initialEvent?.color ?? null,
        reminderMinutes: reminders,
        updatedAt: now,
        deletedAt: null,
        syncStatus: 'pending',
      };

      await enqueueEvent(db, event);
      await scheduleEventReminders(event);

      notifyLocalChange();
      router.back();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll>
      <View style={{ paddingTop: spacing.lg }}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text style={[typography.body, { color: colors.accent }]}>Cancel</Text>
          </Pressable>
          <Text style={[typography.heading, { color: colors.text }]}>
            {initialEvent ? 'Edit event' : 'New event'}
          </Text>
          <View style={{ width: 44 }} />
        </View>

        <TextField
          label="Title"
          value={title}
          onChangeText={setTitle}
          placeholder="Dinner, trip, anniversary…"
          maxLength={200}
        />

        <TextField
          label="Date"
          value={dateKey}
          onChangeText={setDateKey}
          placeholder="YYYY-MM-DD"
          autoCapitalize="none"
          hint="Calendar date — never shifts with time zones."
        />

        <View style={[styles.switchRow, { marginBottom: spacing.lg }]}>
          <Text style={[typography.body, { color: colors.text }]}>All day</Text>
          <Switch value={allDay} onValueChange={setAllDay} />
        </View>

        {!allDay ? (
          <View style={styles.timeRow}>
            <View style={{ flex: 1 }}>
              <TextField
                label="Start (HH:MM)"
                value={startTime}
                onChangeText={setStartTime}
                autoCapitalize="none"
              />
            </View>
            <View style={{ width: spacing.md }} />
            <View style={{ flex: 1 }}>
              <TextField
                label="End (HH:MM)"
                value={endTime}
                onChangeText={setEndTime}
                autoCapitalize="none"
              />
            </View>
          </View>
        ) : null}

        <TextField
          label="Location (optional)"
          value={location}
          onChangeText={setLocation}
          placeholder="Somewhere"
          maxLength={300}
        />

        <TextField
          label="Notes (optional)"
          value={description}
          onChangeText={setDescription}
          placeholder="Anything worth remembering"
          multiline
          numberOfLines={3}
          maxLength={4000}
          style={{ minHeight: 80, textAlignVertical: 'top' }}
        />

        <Text
          style={[
            typography.caption,
            { color: colors.textMuted, marginBottom: spacing.sm },
          ]}
        >
          Who can see it
        </Text>

        <View style={[styles.pillRow, { marginBottom: spacing.lg }]}>
          {(['shared', 'private'] as EventVisibility[]).map((value) => {
            const active = visibility === value;
            return (
              <Pressable
                key={value}
                onPress={() => setVisibility(value)}
                style={[
                  styles.pill,
                  {
                    backgroundColor: active ? colors.accent : colors.surfaceMuted,
                    borderRadius: radii.pill,
                    paddingHorizontal: spacing.lg,
                    paddingVertical: spacing.sm,
                  },
                ]}
              >
                <Text
                  style={[
                    typography.caption,
                    { color: active ? colors.onAccent : colors.textMuted },
                  ]}
                >
                  {value === 'shared' ? 'Both of us' : 'Only me'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text
          style={[
            typography.caption,
            { color: colors.textMuted, marginBottom: spacing.sm },
          ]}
        >
          Reminder
        </Text>

        <View style={[styles.pillRow, { marginBottom: spacing.xl }]}>
          {REMINDER_OPTIONS.map((option) => {
            const active =
              option.minutes.length === reminders.length &&
              option.minutes.every((value) => reminders.includes(value));

            return (
              <Pressable
                key={option.label}
                onPress={() => setReminders(option.minutes)}
                style={[
                  styles.pill,
                  {
                    backgroundColor: active ? colors.accent : colors.surfaceMuted,
                    borderRadius: radii.pill,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                  },
                ]}
              >
                <Text
                  style={[
                    typography.caption,
                    { color: active ? colors.onAccent : colors.textMuted },
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Button label="Save event" onPress={save} loading={busy} />

        {error ? (
          <Text
            style={[
              typography.caption,
              { color: colors.danger, marginTop: spacing.md },
            ]}
          >
            {error}
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeRow: { flexDirection: 'row' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { alignItems: 'center', justifyContent: 'center' },
});
