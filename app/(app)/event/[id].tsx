import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '../../../src/components/Screen';
import { Card } from '../../../src/components/Card';
import { Button } from '../../../src/components/Button';
import { StatusPill } from '../../../src/components/StatusPill';
import { LoadingScreen } from '../../../src/components/LoadingScreen';
import { useAuth } from '../../../src/auth/AuthProvider';
import { useSync } from '../../../src/sync/SyncProvider';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { enqueueEventDeletion, getEvent } from '../../../src/db/events';
import { cancelEventReminders } from '../../../src/notifications/reminders';
import { formatEventRange } from '../../../src/utils/date';
import { errorMessage } from '../../../src/utils/errors';
import type { CalendarEvent } from '../../../src/types';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const { colors, spacing, typography, radii } = useTheme();
  const { userId, members } = useAuth();
  const { notifyLocalChange, lastSyncedAt } = useSync();

  const [event, setEvent] = useState<CalendarEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const row = await getEvent(db, id);
    setEvent(row);
    setLoading(false);
  }, [db, id]);

  useEffect(() => {
    void load();
  }, [load, lastSyncedAt]);

  const remove = () => {
    if (!event) return;

    Alert.alert(
      'Delete this event?',
      'It will be removed from both phones. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await enqueueEventDeletion(db, event);
                await cancelEventReminders(event.id);
                notifyLocalChange();
                router.back();
              } catch (caught) {
                setError(errorMessage(caught));
              }
            })();
          },
        },
      ],
    );
  };

  if (loading) return <LoadingScreen label="Opening event" />;

  if (!event) {
    return (
      <Screen>
        <View style={{ paddingTop: spacing.xxl }}>
          <Text style={[typography.heading, { color: colors.text }]}>
            This event is not on this device
          </Text>
          <Text style={[typography.body, { color: colors.textMuted, marginTop: spacing.sm }]}>
            It may have been deleted, or it was created while you were offline.
          </Text>
          <Button
            label="Back"
            variant="secondary"
            onPress={() => router.back()}
            style={{ marginTop: spacing.lg }}
          />
        </View>
      </Screen>
    );
  }

  const isMine = event.createdBy === userId;
  const canModify = !event.deletedAt && (isMine || event.visibility === 'shared');
  const creator = members.find((m) => m.userId === event.createdBy);
  const creatorName = isMine ? 'You' : (creator?.displayName || 'Your partner');

  return (
    <Screen scroll>
      <View style={{ paddingTop: spacing.lg }}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>

          <View style={styles.headerActions}>
            <StatusPill
              label={
                event.syncStatus === 'sent'
                  ? 'Synced'
                  : event.syncStatus === 'pending'
                    ? 'Waiting'
                    : 'Failed'
              }
              tone={
                event.syncStatus === 'sent'
                  ? 'success'
                  : event.syncStatus === 'pending'
                    ? 'pending'
                    : 'danger'
              }
            />
            {canModify ? (
              <Pressable
                onPress={() => router.push(`/(app)/event/${event.id}/edit`)}
                hitSlop={8}
                accessibilityLabel="Edit event"
              >
                <Text style={[typography.bodyStrong, { color: colors.accent }]}>
                  Edit
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <Text style={[typography.display, { color: colors.text, marginTop: spacing.md }]}>
          {event.title}
        </Text>

        <Text
          style={[
            typography.body,
            { color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.xl },
          ]}
        >
          {formatEventRange(event)}
        </Text>

        <Card style={{ marginBottom: spacing.md }}>
          <DetailRow label="Visibility" value={event.visibility === 'shared' ? 'Both of us' : 'Only me'} />
          {event.location ? <DetailRow label="Where" value={event.location} /> : null}
          {event.reminderMinutes.length > 0 ? (
            <DetailRow
              label="Reminder"
              value={event.reminderMinutes
                .map((minutes) =>
                  minutes >= 1440 ? `${minutes / 1440} day before` : `${minutes} min before`,
                )
                .join(', ')}
            />
          ) : null}
          <DetailRow label="Created by" value={creatorName} />
        </Card>

        {event.description ? (
          <Card style={{ marginBottom: spacing.md }}>
            <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 4 }]}>
              Notes
            </Text>
            <Text style={[typography.body, { color: colors.text }]}>{event.description}</Text>
          </Card>
        ) : null}

        {canModify ? (
          <Button
            label="Delete event"
            variant="danger"
            onPress={remove}
            style={{ marginTop: spacing.lg }}
          />
        ) : null}

        {error ? (
          <Text style={[typography.caption, { color: colors.danger, marginTop: spacing.md }]}>
            {error}
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const { colors, spacing, typography } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: spacing.xs,
      }}
    >
      <Text style={[typography.caption, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[typography.caption, { color: colors.text, flexShrink: 1, textAlign: 'right' }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
