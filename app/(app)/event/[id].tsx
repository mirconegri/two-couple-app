import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { Screen } from '../../../src/components/Screen';
import { ListSection } from '../../../src/components/ListSection';
import { ListRow } from '../../../src/components/ListRow';
import { LoadingScreen } from '../../../src/components/LoadingScreen';
import { Button } from '../../../src/components/Button';
import { Text } from '../../../src/components/Text';
import { TopAppBar } from '../../../src/components/TopAppBar';
import { IconButton } from '../../../src/components/IconButton';
import { EmptyState } from '../../../src/components/EmptyState';
import { useAuth } from '../../../src/auth/AuthProvider';
import { useSync } from '../../../src/sync/SyncProvider';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { useSettings } from '../../../src/settings/SettingsProvider';
import { useHaptics } from '../../../src/lib/haptics';
import { enqueueEventDeletion, getEvent } from '../../../src/db/events';
import { cancelEventReminders } from '../../../src/notifications/reminders';
import { formatEventRange } from '../../../src/utils/date';
import { errorMessage } from '../../../src/utils/errors';
import { shape, spacing } from '../../../src/theme/tokens';
import type { CalendarEvent } from '../../../src/types';

function reminderLabel(minutes: number): string {
  if (minutes >= 1440) {
    const days = minutes / 1440;
    return days === 1 ? '1 day before' : `${days} days before`;
  }
  if (minutes >= 60) {
    const hours = minutes / 60;
    return hours === 1 ? '1 hour before' : `${hours} hours before`;
  }
  return `${minutes} min before`;
}

const SYNC_LABEL = { sent: 'Synced', pending: 'Waiting', failed: 'Not synced' } as const;

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const { colors } = useTheme();
  const { settings } = useSettings();
  const { userId, members } = useAuth();
  const { notifyLocalChange, lastSyncedAt } = useSync();
  const haptics = useHaptics();

  const [event, setEvent] = useState<CalendarEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setEvent(await getEvent(db, id));
    setLoading(false);
  }, [db, id]);

  useEffect(() => {
    void load();
  }, [load, lastSyncedAt]);

  const remove = () => {
    if (!event) return;
    haptics.longPress();

    Alert.alert('Delete this event?', 'It will be removed from both phones. This cannot be undone.', [
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
    ]);
  };

  if (loading) return <LoadingScreen message="Opening event" />;

  if (!event) {
    return (
      <>
        <TopAppBar title="Event" onBack={() => router.back()} />
        <Screen>
          <EmptyState
            icon="cloud-offline-outline"
            title="Not on this device"
            description="It may have been deleted, or it was created while you were offline."
          />
        </Screen>
      </>
    );
  }

  const isMine = event.createdBy === userId;
  const canModify = !event.deletedAt && (isMine || event.visibility === 'shared');
  const creatorName = isMine
    ? 'You'
    : members.find((member) => member.userId === event.createdBy)?.displayName || 'Your partner';

  return (
    <>
      <TopAppBar
        title={event.title}
        onBack={() => router.back()}
        actions={
          canModify ? (
            <IconButton
              icon="pencil"
              variant="tonal"
              onPress={() => router.push(`/(app)/event/${event.id}/edit`)}
              accessibilityLabel="Edit event"
            />
          ) : undefined
        }
      />

      <Screen scroll contentStyle={styles.content}>
        <View style={styles.headerRow}>
          <View
            style={[
              styles.stripe,
              { backgroundColor: event.color ?? colors.primary, borderRadius: shape.full },
            ]}
          />
          <View style={styles.headerText}>
            <Text variant="headlineSmall" strong>
              {event.title}
            </Text>
            <Text variant="bodyLarge" color="onSurfaceVariant">
              {formatEventRange(event, settings.use24Hour)}
            </Text>
          </View>
        </View>

        <ListSection title="Details">
          <ListRow
            icon="eye"
            title="Visibility"
            value={event.visibility === 'shared' ? 'Both of us' : 'Only me'}
          />
          <ListRow
            icon="color-palette"
            title="Colour"
            value={event.color ? undefined : 'Theme default'}
            trailing={
              event.color ? (
                <View style={[styles.dot, { backgroundColor: event.color }]} />
              ) : undefined
            }
          />
          {event.location ? <ListRow icon="location" title="Where" value={event.location} /> : null}
          {event.reminderMinutes.length > 0 ? (
            <ListRow
              icon="notifications"
              title="Reminder"
              value={event.reminderMinutes.map(reminderLabel).join(', ')}
            />
          ) : null}
          <ListRow icon="person" title="Created by" value={creatorName} />
          <ListRow
            icon={
              event.syncStatus === 'failed'
                ? 'cloud-offline'
                : event.syncStatus === 'pending'
                  ? 'cloud-upload'
                  : 'cloud-done'
            }
            title="Sync"
            value={SYNC_LABEL[event.syncStatus]}
          />
        </ListSection>

        {event.description ? (
          <ListSection title="Notes">
            <View style={styles.notes}>
              <Text variant="bodyLarge" selectable>
                {event.description}
              </Text>
            </View>
          </ListSection>
        ) : null}

        {canModify ? (
          <>
            <Button
              label="Edit event"
              icon="pencil"
              variant="tonal"
              onPress={() => router.push(`/(app)/event/${event.id}/edit`)}
              size="medium"
              fullWidth
            />
            <View style={styles.gap} />
            <Button
              label="Delete event"
              icon="trash-outline"
              variant="danger"
              onPress={remove}
              size="medium"
              fullWidth
            />
          </>
        ) : null}

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
  headerRow: { flexDirection: 'row', gap: spacing.lg, marginBottom: spacing.xl },
  stripe: { width: 6, alignSelf: 'stretch' },
  headerText: { flex: 1, gap: spacing.xs },
  dot: { width: 16, height: 16, borderRadius: shape.full },
  notes: { padding: spacing.lg },
  gap: { height: spacing.sm },
  error: { marginTop: spacing.md, textAlign: 'center' },
});
