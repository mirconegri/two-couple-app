import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { format, isSameDay, isToday, setYear, startOfMonth } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../theme/ThemeProvider';
import { withAlpha } from '../theme/color';
import { elevation, shape, spacing } from '../theme/tokens';
import {
  buildMonthGrid,
  shiftMonth,
  weekdayLabels,
  type WeekStart,
} from '../utils/date';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export interface DatePickerModalProps {
  visible: boolean;
  value: Date;
  weekStartsOn: WeekStart;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
}

const YEAR_PAST_SPAN = 10;
const YEAR_FUTURE_SPAN = 20;

export function DatePickerModal({
  visible,
  value,
  weekStartsOn,
  onConfirm,
  onCancel,
}: DatePickerModalProps) {
  const { colors } = useTheme();
  const [draft, setDraft] = useState<Date>(() => new Date(value));
  const [anchor, setAnchor] = useState<Date>(() => startOfMonth(value));
  const [selectingYear, setSelectingYear] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const safe = Number.isNaN(value.getTime()) ? new Date() : new Date(value);
    setDraft(safe);
    setAnchor(startOfMonth(safe));
    setSelectingYear(false);
  }, [visible, value]);

  const cells = useMemo(() => buildMonthGrid(anchor, weekStartsOn), [anchor, weekStartsOn]);
  const headers = useMemo(() => weekdayLabels(weekStartsOn), [weekStartsOn]);

  const years = useMemo(() => {
    const baseYear = new Date().getFullYear();
    const minYear = Math.min(baseYear - YEAR_PAST_SPAN, draft.getFullYear() - 5);
    const maxYear = Math.max(baseYear + YEAR_FUTURE_SPAN, draft.getFullYear() + 5);
    return Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i);
  }, [draft]);

  const handleSelectDay = (date: Date, inMonth: boolean) => {
    setDraft(date);
    if (!inMonth) {
      setAnchor(startOfMonth(date));
    }
  };

  const handleSelectYear = (year: number) => {
    const nextDraft = setYear(draft, year);
    setDraft(nextDraft);
    setAnchor(startOfMonth(new Date(year, anchor.getMonth(), 1)));
    setSelectingYear(false);
  };

  const handleToday = () => {
    const today = new Date();
    setDraft(today);
    setAnchor(startOfMonth(today));
    setSelectingYear(false);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={[styles.backdrop, { backgroundColor: withAlpha(colors.scrim, 0.5) }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onCancel}
          accessibilityLabel="Close date picker"
        />

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surfaceContainerHigh,
              borderRadius: shape.xl,
              shadowColor: colors.shadow,
              elevation: elevation.level3,
            },
          ]}
        >
          <View style={styles.header}>
            <Text variant="labelMedium" color="onSurfaceVariant">
              SELECT DATE
            </Text>
            <Text variant="headlineSmall" color="onSurface" strong style={styles.headline}>
              {format(draft, 'EEE, d MMM yyyy')}
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />

          <View style={styles.navRow}>
            <PressableScale
              onPress={() => setSelectingYear((prev) => !prev)}
              haptics="selection"
              accessibilityRole="button"
              accessibilityLabel={selectingYear ? 'Back to calendar' : 'Choose year'}
              style={styles.monthToggle}
            >
              <Text variant="titleSmall" color="onSurface" strong>
                {format(anchor, 'MMMM yyyy')}
              </Text>
              <Ionicons
                name={selectingYear ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.onSurfaceVariant}
              />
            </PressableScale>

            {!selectingYear ? (
              <View style={styles.navButtons}>
                <IconButton
                  icon="chevron-back"
                  size="sm"
                  onPress={() => setAnchor((cur) => shiftMonth(cur, -1))}
                  accessibilityLabel="Previous month"
                />
                <IconButton
                  icon="chevron-forward"
                  size="sm"
                  onPress={() => setAnchor((cur) => shiftMonth(cur, 1))}
                  accessibilityLabel="Next month"
                />
              </View>
            ) : null}
          </View>

          {selectingYear ? (
            <ScrollView
              style={styles.yearScroll}
              contentContainerStyle={styles.yearGrid}
              showsVerticalScrollIndicator={false}
            >
              {years.map((year) => {
                const selected = year === draft.getFullYear();
                return (
                  <PressableScale
                    key={year}
                    onPress={() => handleSelectYear(year)}
                    haptics="selection"
                    accessibilityRole="button"
                    accessibilityLabel={`Year ${year}`}
                    accessibilityState={{ selected }}
                    style={styles.yearCell}
                  >
                    <View
                      style={[
                        styles.yearPill,
                        {
                          backgroundColor: selected ? colors.primary : 'transparent',
                          borderRadius: shape.full,
                        },
                      ]}
                    >
                      <Text
                        variant="bodyMedium"
                        strong={selected}
                        style={{ color: selected ? colors.onPrimary : colors.onSurface }}
                      >
                        {year}
                      </Text>
                    </View>
                  </PressableScale>
                );
              })}
            </ScrollView>
          ) : (
            <View style={styles.calendarBody}>
              <View style={styles.weekRow}>
                {headers.map((label, idx) => (
                  <View key={`${label}-${idx}`} style={styles.weekCell}>
                    <Text variant="labelSmall" color="onSurfaceVariant">
                      {label}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.daysGrid}>
                {cells.map((cell) => {
                  const selected = isSameDay(cell.date, draft);
                  const today = isToday(cell.date);
                  return (
                    <PressableScale
                      key={cell.key}
                      onPress={() => handleSelectDay(cell.date, cell.inMonth)}
                      haptics="selection"
                      accessibilityRole="button"
                      accessibilityLabel={format(cell.date, 'EEEE d MMMM yyyy')}
                      accessibilityState={{ selected }}
                      style={styles.dayCell}
                    >
                      <View
                        style={[
                          styles.dayCircle,
                          {
                            borderRadius: shape.full,
                            backgroundColor: selected ? colors.primary : 'transparent',
                            borderWidth: today && !selected ? 1.5 : 0,
                            borderColor: colors.primary,
                          },
                        ]}
                      >
                        <Text
                          variant="bodyMedium"
                          strong={selected || today}
                          style={{
                            color: selected
                              ? colors.onPrimary
                              : today
                                ? colors.primary
                                : cell.inMonth
                                  ? colors.onSurface
                                  : colors.onSurfaceVariant,
                            opacity: cell.inMonth || selected || today ? 1 : 0.38,
                          }}
                        >
                          {cell.date.getDate()}
                        </Text>
                      </View>
                    </PressableScale>
                  );
                })}
              </View>
            </View>
          )}

          <View style={styles.footerBetween}>
            <Button label="Today" variant="text" size="small" onPress={handleToday} />
            <View style={styles.footerActions}>
              <Button label="Cancel" variant="text" size="small" onPress={onCancel} />
              <Button
                label="OK"
                variant="filled"
                size="small"
                onPress={() => onConfirm(draft)}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export interface TimePickerModalProps {
  visible: boolean;
  title?: string;
  hours: number;
  minutes: number;
  use24Hour: boolean;
  onConfirm: (hours: number, minutes: number) => void;
  onCancel: () => void;
}

const HOURS_24 = Array.from({ length: 24 }, (_, i) => i);
const HOURS_12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTES_STEP_5 = Array.from({ length: 12 }, (_, i) => i * 5);

export function TimePickerModal({
  visible,
  title = 'Select time',
  hours,
  minutes,
  use24Hour,
  onConfirm,
  onCancel,
}: TimePickerModalProps) {
  const { colors } = useTheme();
  const [draftHour, setDraftHour] = useState(hours);
  const [draftMinute, setDraftMinute] = useState(minutes);
  const [activeField, setActiveField] = useState<'hour' | 'minute'>('hour');

  useEffect(() => {
    if (!visible) return;
    setDraftHour(Math.min(23, Math.max(0, hours)));
    setDraftMinute(Math.min(59, Math.max(0, minutes)));
    setActiveField('hour');
  }, [visible, hours, minutes]);

  const isPm = draftHour >= 12;
  const displayHour = use24Hour
    ? String(draftHour).padStart(2, '0')
    : String(draftHour % 12 || 12).padStart(2, '0');
  const displayMinute = String(draftMinute).padStart(2, '0');

  const selectHour12 = (h12: number) => {
    const normalized = h12 % 12;
    setDraftHour(isPm ? normalized + 12 : normalized);
    setActiveField('minute');
  };

  const selectHour24 = (h24: number) => {
    setDraftHour(h24);
    setActiveField('minute');
  };

  const setMeridiem = (pm: boolean) => {
    if (pm === isPm) return;
    setDraftHour((cur) => (pm ? (cur % 12) + 12 : cur % 12));
  };

  const stepMinute = (delta: number) => {
    setDraftMinute((cur) => (cur + delta + 60) % 60);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={[styles.backdrop, { backgroundColor: withAlpha(colors.scrim, 0.5) }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onCancel}
          accessibilityLabel="Close time picker"
        />

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surfaceContainerHigh,
              borderRadius: shape.xl,
              shadowColor: colors.shadow,
              elevation: elevation.level3,
            },
          ]}
        >
          <View style={styles.header}>
            <Text variant="labelMedium" color="onSurfaceVariant">
              {title.toUpperCase()}
            </Text>
          </View>

          <View style={styles.timeDisplayRow}>
            <PressableScale
              onPress={() => setActiveField('hour')}
              haptics="selection"
              accessibilityRole="button"
              accessibilityLabel={`Hour ${displayHour}`}
              accessibilityState={{ selected: activeField === 'hour' }}
              style={[
                styles.timeBox,
                {
                  borderRadius: shape.lg,
                  backgroundColor:
                    activeField === 'hour'
                      ? colors.primaryContainer
                      : colors.surfaceContainerHighest,
                },
              ]}
            >
              <Text
                variant="headlineLarge"
                strong
                style={[
                  styles.tabular,
                  {
                    color:
                      activeField === 'hour'
                        ? colors.onPrimaryContainer
                        : colors.onSurface,
                  },
                ]}
              >
                {displayHour}
              </Text>
            </PressableScale>

            <Text variant="headlineLarge" strong color="onSurface">
              :
            </Text>

            <PressableScale
              onPress={() => setActiveField('minute')}
              haptics="selection"
              accessibilityRole="button"
              accessibilityLabel={`Minute ${displayMinute}`}
              accessibilityState={{ selected: activeField === 'minute' }}
              style={[
                styles.timeBox,
                {
                  borderRadius: shape.lg,
                  backgroundColor:
                    activeField === 'minute'
                      ? colors.primaryContainer
                      : colors.surfaceContainerHighest,
                },
              ]}
            >
              <Text
                variant="headlineLarge"
                strong
                style={[
                  styles.tabular,
                  {
                    color:
                      activeField === 'minute'
                        ? colors.onPrimaryContainer
                        : colors.onSurface,
                  },
                ]}
              >
                {displayMinute}
              </Text>
            </PressableScale>

            {!use24Hour ? (
              <View
                style={[
                  styles.meridiemBox,
                  { borderRadius: shape.md, borderColor: colors.outline },
                ]}
              >
                <PressableScale
                  onPress={() => setMeridiem(false)}
                  haptics="selection"
                  accessibilityRole="button"
                  accessibilityLabel="AM"
                  accessibilityState={{ selected: !isPm }}
                  style={[
                    styles.meridiemHalf,
                    {
                      backgroundColor: !isPm
                        ? colors.tertiaryContainer
                        : colors.surfaceContainerHighest,
                    },
                  ]}
                >
                  <Text
                    variant="labelLarge"
                    strong={!isPm}
                    style={{
                      color: !isPm ? colors.onTertiaryContainer : colors.onSurfaceVariant,
                    }}
                  >
                    AM
                  </Text>
                </PressableScale>
                <View style={[styles.divider, { backgroundColor: colors.outline }]} />
                <PressableScale
                  onPress={() => setMeridiem(true)}
                  haptics="selection"
                  accessibilityRole="button"
                  accessibilityLabel="PM"
                  accessibilityState={{ selected: isPm }}
                  style={[
                    styles.meridiemHalf,
                    {
                      backgroundColor: isPm
                        ? colors.tertiaryContainer
                        : colors.surfaceContainerHighest,
                    },
                  ]}
                >
                  <Text
                    variant="labelLarge"
                    strong={isPm}
                    style={{
                      color: isPm ? colors.onTertiaryContainer : colors.onSurfaceVariant,
                    }}
                  >
                    PM
                  </Text>
                </PressableScale>
              </View>
            ) : null}
          </View>

          <View style={styles.timeGridWrap}>
            {activeField === 'hour' ? (
              <View style={styles.timeGrid}>
                {(use24Hour ? HOURS_24 : HOURS_12).map((h) => {
                  const selected = use24Hour
                    ? draftHour === h
                    : (draftHour % 12 || 12) === h;
                  return (
                    <PressableScale
                      key={h}
                      onPress={() => (use24Hour ? selectHour24(h) : selectHour12(h))}
                      haptics="selection"
                      accessibilityRole="button"
                      accessibilityLabel={`Hour ${h}`}
                      accessibilityState={{ selected }}
                      style={use24Hour ? styles.hourCell24 : styles.hourCell12}
                    >
                      <View
                        style={[
                          styles.timeGridPill,
                          {
                            borderRadius: shape.full,
                            backgroundColor: selected
                              ? colors.primary
                              : colors.surfaceContainer,
                          },
                        ]}
                      >
                        <Text
                          variant="bodyMedium"
                          strong={selected}
                          style={[
                            styles.tabular,
                            { color: selected ? colors.onPrimary : colors.onSurface },
                          ]}
                        >
                          {String(h).padStart(2, '0')}
                        </Text>
                      </View>
                    </PressableScale>
                  );
                })}
              </View>
            ) : (
              <>
                <View style={styles.timeGrid}>
                  {MINUTES_STEP_5.map((m) => {
                    const selected = draftMinute === m;
                    return (
                      <PressableScale
                        key={m}
                        onPress={() => setDraftMinute(m)}
                        haptics="selection"
                        accessibilityRole="button"
                        accessibilityLabel={`Minute ${m}`}
                        accessibilityState={{ selected }}
                        style={styles.hourCell12}
                      >
                        <View
                          style={[
                            styles.timeGridPill,
                            {
                              borderRadius: shape.full,
                              backgroundColor: selected
                                ? colors.primary
                                : colors.surfaceContainer,
                            },
                          ]}
                        >
                          <Text
                            variant="bodyMedium"
                            strong={selected}
                            style={[
                              styles.tabular,
                              { color: selected ? colors.onPrimary : colors.onSurface },
                            ]}
                          >
                            {String(m).padStart(2, '0')}
                          </Text>
                        </View>
                      </PressableScale>
                    );
                  })}
                </View>

                <View style={styles.fineTuneRow}>
                  <IconButton
                    icon="remove"
                    variant="tonal"
                    size="sm"
                    onPress={() => stepMinute(-1)}
                    accessibilityLabel="Decrease minute"
                  />
                  <Text variant="labelLarge" color="onSurfaceVariant" style={styles.tabular}>
                    :{displayMinute}
                  </Text>
                  <IconButton
                    icon="add"
                    variant="tonal"
                    size="sm"
                    onPress={() => stepMinute(1)}
                    accessibilityLabel="Increase minute"
                  />
                </View>
              </>
            )}
          </View>

          <View style={styles.footerEnd}>
            <Button label="Cancel" variant="text" size="small" onPress={onCancel} />
            <Button
              label="OK"
              variant="filled"
              size="small"
              onPress={() => onConfirm(draftHour, draftMinute)}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    overflow: 'hidden',
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  headline: {
    marginTop: spacing.xs,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    paddingVertical: spacing.xs,
    minHeight: 48,
  },
  monthToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  navButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calendarBody: {
    paddingHorizontal: spacing.md,
    minHeight: 276,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  weekCell: {
    flex: 1,
    alignItems: 'center',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircle: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearScroll: {
    height: 276,
    paddingHorizontal: spacing.md,
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: spacing.xs,
  },
  yearCell: {
    width: `${100 / 3}%`,
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  yearPill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  footerBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  footerEnd: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  timeDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  timeBox: {
    minWidth: 84,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  meridiemBox: {
    width: 52,
    height: 68,
    borderWidth: 1,
    overflow: 'hidden',
  },
  meridiemHalf: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabular: {
    fontVariant: ['tabular-nums'],
  },
  timeGridWrap: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  hourCell24: {
    width: `${100 / 6}%`,
    padding: 3,
  },
  hourCell12: {
    width: `${100 / 4}%`,
    padding: 4,
  },
  timeGridPill: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fineTuneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
});
