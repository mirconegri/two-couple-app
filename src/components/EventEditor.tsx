import React, { useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';

import { Screen } from './Screen';
import { TextField } from './TextField';
import { Button } from './Button';
import { Text } from './Text';
import { TopAppBar } from './TopAppBar';
import { IconButton } from './IconButton';
import { ListSection } from './ListSection';
import { ListRow } from './ListRow';
import { SegmentedButton } from './SegmentedButton';
import { SwitchRow } from './SwitchRow';
import { Chip } from './Chip';
import { PressableScale } from './PressableScale';
import { useAuth } from '../auth/AuthProvider';
import { useSync } from '../sync/SyncProvider';
import { useSettings } from '../settings/SettingsProvider';
import { useTheme } from '../theme/ThemeProvider';
import { useHaptics } from '../lib/haptics';
import { eventColors, shape, spacing } from '../theme/tokens';
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

export interface EventEditorProps {
  initialEvent?: CalendarEvent | null;
  defaultDate?: string;
}

function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map((part) => Number.parseInt(part, 10));
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

function timeStringToDate(time: string, baseDate: Date): Date {
  const [hours, minutes] = time.split(':').map((part) => Number.parseInt(part, 10));
  const date = new Date(baseDate);
  date.setHours(hours ?? 0, minutes ?? 0, 0, 0);
  return date;
}

function displayTime(time: string, baseDate: Date, use24Hour: boolean): string {
  return format(timeStringToDate(time, baseDate), use24Hour ? 'HH:mm' : 'h:mm a');
}

export function EventEditor({ initialEvent, defaultDate }: EventEditorProps) {
  const db = useSQLiteContext();
  const { colors, scheme } = useTheme();
  const { coupleId, userId } = useAuth();
  const { notifyLocalChange } = useSync();
  const { settings } = useSettings();
  const haptics = useHaptics();

  const initialDateKey = () => {
    if (initialEvent) {
      if (initialEvent.allDay && initialEvent.startsOn) return initialEvent.startsOn;
      if (initialEvent.startsAt) return toDateKey(new Date(initialEvent.startsAt));
    }
    const parsed = defaultDate ? parseDateKey(defaultDate) : new Date();
    return toDateKey(Number.isNaN(parsed.getTime()) ? new Date() : parsed);
  };

  const initialTime = (iso: string | null | undefined, fallback: string) => {
    if (!iso) return fallback;
    const parsed = new Date(iso);
    return Number.isNaN(parsed.getTime()) ? fallback : format(parsed, 'HH:mm');
  };

  const [title, setTitle] = useState(initialEvent?.title ?? '');
  const [description, setDescription] = useState(initialEvent?.description ?? '');
  const [location, setLocation] = useState(initialEvent?.location ?? '');
  const [allDay, setAllDay] = useState(initialEvent?.allDay ?? true);
  const [dateKey, setDateKey] = useState(initialDateKey);
  const [startTime, setStartTime] = useState(() => initialTime(initialEvent?.startsAt, '18:00'));
  const [endTime, setEndTime] = useState(() => initialTime(initialEvent?.endsAt, '19:00'));
  const [visibility, setVisibility] = useState<EventVisibility>(initialEvent?.visibility ?? 'shared');
  const [reminders, setReminders] = useState<number[]>(initialEvent?.reminderMinutes ?? []);
  const [selectedColor, setSelectedColor] = useState<string | null>(initialEvent?.color ?? null);

  const [picker, setPicker] = useState<'date' | 'start' | 'end' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const currentDate = useMemo(() => {
    const parsed = parseDateKey(dateKey);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }, [dateKey]);

  const togglePicker = (next: 'date' | 'start' | 'end') => {
    haptics.tick();
    setPicker((current) => (current === next ? null : next));
  };

  const onDateChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setPicker(null);
    if (event.type === 'set' && selected) setDateKey(toDateKey(selected));
  };

  const onStartTimeChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setPicker(null);
    if (event.type !== 'set' || !selected) return;

    const next = format(selected, 'HH:mm');
    setStartTime(next);
    if (parseTimeToMinutes(next) >= parseTimeToMinutes(endTime)) {
      const bumped = new Date(selected);
      bumped.setHours(selected.getHours() + 1);
      setEndTime(format(bumped, 'HH:mm'));
    }
  };

  const onEndTimeChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setPicker(null);
    if (event.type !== 'set' || !selected) return;

    const next = format(selected, 'HH:mm');
    if (parseTimeToMinutes(next) <= parseTimeToMinutes(startTime)) {
      const bumped = timeStringToDate(startTime, currentDate);
      bumped.setHours(bumped.getHours() + 1);
      setEndTime(format(bumped, 'HH:mm'));
    } else {
      setEndTime(next);
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
        const start = timeStringToDate(startTime, base);
        const end = timeStringToDate(endTime, base);
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
        color: selectedColor,
        reminderMinutes: reminders,
        updatedAt: new Date().toISOString(),
        deletedAt: null,
        syncStatus: 'pending',
      };

      await enqueueEvent(db, event);
      await scheduleEventReminders(event);

      notifyLocalChange();
      haptics.confirm();
      router.back();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const pickerRow = (
    mode: 'date' | 'start' | 'end',
    icon: keyof typeof Ionicons.glyphMap,
    label: string,
    value: string,
  ) => (
    <ListRow
      icon={icon}
      title={label}
      value={value}
      onPress={() => togglePicker(mode)}
      trailing={
        picker === mode ? (
          <Ionicons name="chevron-up" size={20} color={colors.onSurfaceVariant} />
        ) : undefined
      }
    />
  );

  const renderPicker = (mode: 'date' | 'start' | 'end') => {
    if (picker !== mode) return null;
    if (mode === 'date') {
      return (
        <DateTimePicker
          value={currentDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          themeVariant={scheme}
          onChange={onDateChange}
        />
      );
    }
    return (
      <DateTimePicker
        value={timeStringToDate(mode === 'start' ? startTime : endTime, currentDate)}
        mode="time"
        is24Hour={settings.use24Hour}
        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
        themeVariant={scheme}
        onChange={mode === 'start' ? onStartTimeChange : onEndTimeChange}
      />
    );
  };

  return (
    <>
      <TopAppBar
        title={initialEvent ? 'Edit event' : 'New event'}
        scrollY={scrollY}
        onBack={() => router.back()}
        actions={
          <IconButton
            icon="checkmark"
            variant="filled"
            onPress={save}
            disabled={busy || title.trim().length === 0}
            accessibilityLabel="Save event"
          />
        }
      />

      <Screen scroll onScroll={scrollHandler} contentStyle={styles.content}>
        <TextField
          label="Title"
          value={title}
          onChangeText={setTitle}
          maxLength={200}
          autoFocus={!initialEvent}
        />

        <ListSection title="When">
          {pickerRow('date', 'calendar-outline', 'Date', format(currentDate, 'EEE d MMM yyyy'))}
          <SwitchRow icon="time-outline" title="All day" value={allDay} onChange={setAllDay} />
          {!allDay ? (
            <>
              {pickerRow(
                'start',
                'play-outline',
                'Starts',
                displayTime(startTime, currentDate, settings.use24Hour),
              )}
              {pickerRow(
                'end',
                'stop-outline',
                'Ends',
                displayTime(endTime, currentDate, settings.use24Hour),
              )}
            </>
          ) : null}
        </ListSection>

        {picker ? <View style={styles.picker}>{renderPicker(picker)}</View> : null}

        <TextField label="Location" value={location} onChangeText={setLocation} maxLength={300} />

        <View style={styles.gap} />

        <TextField
          label="Notes"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          maxLength={4000}
          style={styles.notes}
        />

        <ListSection title="Colour">
          <View style={styles.swatches}>
            {[null, ...eventColors].map((swatch) => {
              const selected = selectedColor === swatch;
              return (
                <PressableScale
                  key={swatch ?? 'default'}
                  onPress={() => {
                    haptics.selection();
                    setSelectedColor(swatch);
                  }}
                  scaleTo={0.88}
                  haptics={null}
                  accessibilityRole="button"
                  accessibilityLabel={swatch ? `Colour ${swatch}` : 'No colour'}
                  accessibilityState={{ selected }}
                  style={[
                    styles.swatch,
                    {
                      backgroundColor: swatch ?? colors.surfaceContainerHighest,
                      borderColor: selected ? colors.onSurface : colors.outlineVariant,
                    },
                  ]}
                >
                  {!swatch ? (
                    <Ionicons name="ban-outline" size={18} color={colors.onSurfaceVariant} />
                  ) : selected ? (
                    <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                  ) : null}
                </PressableScale>
              );
            })}
          </View>
        </ListSection>

        <ListSection title="Visibility">
          <View style={styles.padded}>
            <SegmentedButton
              options={[
                { value: 'shared', label: 'Both of us' },
                { value: 'private', label: 'Only me' },
              ]}
              value={visibility}
              onChange={setVisibility}
            />
          </View>
        </ListSection>

        <ListSection title="Reminder" footer="Reminders are scheduled on this device only.">
          <View style={styles.chips}>
            {REMINDER_OPTIONS.map((option) => {
              const selected =
                option.minutes.length === reminders.length &&
                option.minutes.every((value) => reminders.includes(value));
              return (
                <Chip
                  key={option.label}
                  label={option.label}
                  selected={selected}
                  onPress={() => setReminders(option.minutes)}
                />
              );
            })}
          </View>
        </ListSection>

        <Button
          label={initialEvent ? 'Save changes' : 'Add event'}
          onPress={save}
          size="medium"
          fullWidth
          loading={busy}
        />

        {error ? (
          <Text variant="bodySmall" color="error" style={styles.error}>
            {error}
          </Text>
        ) : null}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.lg, paddingBottom: spacing.xxxl },
  gap: { height: spacing.lg },
  notes: { height: 96, textAlignVertical: 'top', paddingTop: spacing.md },
  picker: { marginBottom: spacing.xl },
  padded: { padding: spacing.lg },
  swatches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    padding: spacing.lg,
  },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: shape.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, padding: spacing.lg },
  error: { marginTop: spacing.md },
});
