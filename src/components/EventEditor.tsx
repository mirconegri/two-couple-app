import React, { useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

import { Screen } from './Screen';
import { TextField } from './TextField';
import { Button } from './Button';
import { NavBarButton } from './NavBarButton';
import { SegmentedControl } from './SegmentedControl';
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

function parseTimeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map((part) => Number.parseInt(part, 10));
  return (h ?? 0) * 60 + (m ?? 0);
}

function timeStringToDate(timeStr: string, baseDate: Date): Date {
  const [h, m] = timeStr.split(':').map((part) => Number.parseInt(part, 10));
  const d = new Date(baseDate);
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d;
}

export function EventEditor({ initialEvent, defaultDate }: EventEditorProps) {
  const db = useSQLiteContext();
  const { colors, spacing, typography, radii, scheme } = useTheme();
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

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentDate = useMemo(() => {
    const d = parseDateKey(dateKey);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  }, [dateKey]);

  const onDateChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (event.type === 'set' && selected) {
      setDateKey(toDateKey(selected));
    }
  };

  const onStartTimeChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShowStartTimePicker(false);
    }
    if (event.type === 'set' && selected) {
      const newStartTime = format(selected, 'HH:mm');
      setStartTime(newStartTime);

      const startMins = parseTimeToMinutes(newStartTime);
      const endMins = parseTimeToMinutes(endTime);

      if (startMins >= endMins) {
        const bumped = new Date(selected);
        bumped.setHours(selected.getHours() + 1);
        setEndTime(format(bumped, 'HH:mm'));
      }
    }
  };

  const onEndTimeChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShowEndTimePicker(false);
    }
    if (event.type === 'set' && selected) {
      const newEndTime = format(selected, 'HH:mm');
      const startMins = parseTimeToMinutes(startTime);
      const endMins = parseTimeToMinutes(newEndTime);

      if (endMins <= startMins) {
        const startDate = timeStringToDate(startTime, currentDate);
        startDate.setHours(startDate.getHours() + 1);
        setEndTime(format(startDate, 'HH:mm'));
      } else {
        setEndTime(newEndTime);
      }
    }
  };

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
          <NavBarButton label="Cancel" onPress={() => router.back()} />
          <Text style={[typography.headline, { color: colors.text }]}>
            {initialEvent ? 'Edit event' : 'New event'}
          </Text>
          <NavBarButton
            label="Save"
            bold
            onPress={save}
            disabled={busy || title.trim().length === 0}
          />
        </View>

        <TextField
          label="Title"
          value={title}
          onChangeText={setTitle}
          placeholder="Dinner, trip, anniversary…"
          maxLength={200}
        />

        {/* Date picker row */}
        <View style={{ marginBottom: spacing.lg }}>
          <Text
            style={[
              typography.caption,
              { color: colors.textMuted, marginBottom: spacing.xs },
            ]}
          >
            Date
          </Text>
          <Pressable
            onPress={() => {
              setShowDatePicker((prev) => !prev);
              setShowStartTimePicker(false);
              setShowEndTimePicker(false);
            }}
            accessibilityRole="button"
            accessibilityLabel="Select date"
            style={[
              styles.pickerRow,
              {
                backgroundColor: colors.surface,
                borderColor: showDatePicker ? colors.accent : colors.border,
                borderRadius: radii.md,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.md,
              },
            ]}
          >
            <Text style={[typography.body, { color: colors.text, flex: 1 }]}>
              {format(currentDate, 'EEEE, d MMMM yyyy')}
            </Text>
            <Ionicons name="calendar-outline" size={20} color={colors.textMuted} />
          </Pressable>

          {showDatePicker ? (
            <View style={Platform.OS === 'ios' ? { marginTop: spacing.sm } : undefined}>
              <DateTimePicker
                value={currentDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                themeVariant={scheme}
                onChange={onDateChange}
              />
            </View>
          ) : null}
        </View>

        <View style={[styles.switchRow, { marginBottom: spacing.lg }]}>
          <Text style={[typography.body, { color: colors.text }]}>All day</Text>
          <Switch value={allDay} onValueChange={setAllDay} />
        </View>

        {!allDay ? (
          <View style={[styles.timeRow, { marginBottom: spacing.lg }]}>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  typography.caption,
                  { color: colors.textMuted, marginBottom: spacing.xs },
                ]}
              >
                Start
              </Text>
              <Pressable
                onPress={() => {
                  setShowStartTimePicker((prev) => !prev);
                  setShowEndTimePicker(false);
                  setShowDatePicker(false);
                }}
                accessibilityRole="button"
                accessibilityLabel="Select start time"
                style={[
                  styles.pickerRow,
                  {
                    backgroundColor: colors.surface,
                    borderColor: showStartTimePicker ? colors.accent : colors.border,
                    borderRadius: radii.md,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.md,
                  },
                ]}
              >
                <Text style={[typography.body, { color: colors.text, flex: 1 }]}>
                  {startTime}
                </Text>
                <Ionicons name="time-outline" size={18} color={colors.textMuted} />
              </Pressable>

              {showStartTimePicker ? (
                <View
                  style={Platform.OS === 'ios' ? { marginTop: spacing.sm } : undefined}
                >
                  <DateTimePicker
                    value={timeStringToDate(startTime, currentDate)}
                    mode="time"
                    is24Hour
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    themeVariant={scheme}
                    onChange={onStartTimeChange}
                  />
                </View>
              ) : null}
            </View>

            <View style={{ width: spacing.md }} />

            <View style={{ flex: 1 }}>
              <Text
                style={[
                  typography.caption,
                  { color: colors.textMuted, marginBottom: spacing.xs },
                ]}
              >
                End
              </Text>
              <Pressable
                onPress={() => {
                  setShowEndTimePicker((prev) => !prev);
                  setShowStartTimePicker(false);
                  setShowDatePicker(false);
                }}
                accessibilityRole="button"
                accessibilityLabel="Select end time"
                style={[
                  styles.pickerRow,
                  {
                    backgroundColor: colors.surface,
                    borderColor: showEndTimePicker ? colors.accent : colors.border,
                    borderRadius: radii.md,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.md,
                  },
                ]}
              >
                <Text style={[typography.body, { color: colors.text, flex: 1 }]}>
                  {endTime}
                </Text>
                <Ionicons name="time-outline" size={18} color={colors.textMuted} />
              </Pressable>

              {showEndTimePicker ? (
                <View
                  style={Platform.OS === 'ios' ? { marginTop: spacing.sm } : undefined}
                >
                  <DateTimePicker
                    value={timeStringToDate(endTime, currentDate)}
                    mode="time"
                    is24Hour
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    themeVariant={scheme}
                    onChange={onEndTimeChange}
                  />
                </View>
              ) : null}
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
            { color: colors.textMuted, marginBottom: spacing.xs },
          ]}
        >
          Who can see it
        </Text>

        <SegmentedControl
          options={[
            { value: 'shared', label: 'Both of us' },
            { value: 'private', label: 'Only me' },
          ]}
          value={visibility}
          onChange={setVisibility}
          style={{ marginBottom: spacing.lg }}
        />

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
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
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
