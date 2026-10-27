import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import * as Haptics from 'expo-haptics';

import { Screen } from '../../../src/components/Screen';
import { ListSection } from '../../../src/components/ListSection';
import { ListRow } from '../../../src/components/ListRow';
import { NavBarButton } from '../../../src/components/NavBarButton';
import { StatusPill } from '../../../src/components/StatusPill';
import { LoadingScreen } from '../../../src/components/LoadingScreen';
import { Button } from '../../../src/components/Button';
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
  const { colors, spacing, typography } = useTheme();
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

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
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
          <Text style={[typography.headline, { color: colors.text }]}>
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
      <View style={{ paddingTop: spacing.md, paddingBottom: spacing.xxxl }}>
        {/* Navigation Bar */}
        <View style={styles.navBar}>
          <NavBarButton
            icon="chevron-back"
            label="Calendar"
            onPress={() => router.back()}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
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
              <NavBarButton
                label="Edit"
                bold
                onPress={() => router.push(`/(app)/event/${event.id}/edit`)}
              />
            ) : null}
          </View>
        </View>

        {/* Title & Date */}
        <Text style={[typography.largeTitle, { color: colors.text, marginTop: spacing.sm }]}>
          {event.title}
        </Text>

        <Text
          style={[
            typography.subheadline,
            { color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.xl },
          ]}
        >
          {formatEventRange(event)}
        </Text>

        {/* Details Section */}
        <ListSection title="Details">
          <ListRow
            label="Visibility"
            value={event.visibility === 'shared' ? 'Both of us' : 'Only me'}
            icon="eye"
            iconBg={colors.accent}
          />
          <ListRow
            label="Color"
            value={event.color ? undefined : 'Default (follows theme)'}
            icon="color-palette"
            iconBg={event.color ?? colors.accent}
            rightAction={
              event.color ? (
                <View
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 7,
                    backgroundColor: event.color,
                  }}
                />
              ) : undefined
            }
          />
          {event.location ? (
            <ListRow
              label="Where"
              value={event.location}
              icon="location"
              iconBg="#FF9500"
            />
          ) : null}
          {event.reminderMinutes.length > 0 ? (
            <ListRow
              label="Reminder"
              value={event.reminderMinutes
                .map((minutes) =>
                  minutes >= 1440 ? `${minutes / 1440} day before` : `${minutes} min before`,
                )
                .join(', ')}
              icon="notifications"
              iconBg="#FF3B30"
            />
          ) : null}
          <ListRow
            label="Created by"
            value={creatorName}
            icon="person"
            iconBg="#5856D6"
          />
        </ListSection>

        {event.description ? (
          <ListSection title="Notes">
            <View style={{ padding: spacing.lg }}>
              <Text style={[typography.body, { color: colors.text }]}>{event.description}</Text>
            </View>
          </ListSection>
        ) : null}

        {canModify ? (
          <ListSection>
            <ListRow
              label="Delete Event"
              destructive
              onPress={remove}
            />
          </ListSection>
        ) : null}

        {error ? (
          <Text style={[typography.footnote, { color: colors.danger, marginTop: spacing.md, textAlign: 'center' }]}>
            {error}
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 36,
  },
});
