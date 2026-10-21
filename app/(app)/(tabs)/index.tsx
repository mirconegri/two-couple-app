import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { addDays, isAfter, isBefore } from 'date-fns';

import { Screen } from '../../../src/components/Screen';
import { Card } from '../../../src/components/Card';
import { EventRow } from '../../../src/components/EventRow';
import { EmptyState } from '../../../src/components/EmptyState';
import { Button } from '../../../src/components/Button';
import { useAuth } from '../../../src/auth/AuthProvider';
import { useEvents } from '../../../src/hooks/useEvents';
import { useSync } from '../../../src/sync/SyncProvider';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { formatEventRange } from '../../../src/utils/date';
import { eventDateKey } from '../../../src/utils/date';

export default function HomeScreen() {
  const { colors, spacing, typography, radii } = useTheme();
  const { members, userId } = useAuth();
  const { events } = useEvents();
  const { pendingCount, syncing, lastSyncedAt } = useSync();

  const partner = members.find((member) => member.userId !== userId);

  const upcoming = useMemo(() => {
    const now = new Date();
    const horizon = addDays(now, 30);

    return events
      .filter((event) => !event.deletedAt)
      .filter((event) => {
        if (event.allDay && event.startsOn) {
          const [y, m, d] = event.startsOn.split('-').map(Number);
          if (!y || !m || !d) return false;
          const date = new Date(y, m - 1, d, 23, 59);
          return isAfter(date, now) && isBefore(date, horizon);
        }
        if (event.startsAt) {
          const date = new Date(event.startsAt);
          return isAfter(date, now) && isBefore(date, horizon);
        }
        return false;
      })
      .slice(0, 4);
  }, [events]);

  const nextEvent = upcoming[0];

  return (
    <Screen scroll>
      <View style={{ paddingTop: spacing.lg }}>
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          {syncing
            ? 'Syncing…'
            : pendingCount > 0
              ? `${pendingCount} change${pendingCount === 1 ? '' : 's'} waiting to sync`
              : lastSyncedAt
                ? 'Everything is up to date'
                : 'Not synced yet'}
        </Text>

        <Text
          style={[
            typography.display,
            { color: colors.text, marginTop: spacing.xs, marginBottom: spacing.xl },
          ]}
        >
          {nextEvent ? nextEvent.title : 'Your space'}
        </Text>

        {members.length < 2 ? (
          <Card style={{ marginBottom: spacing.lg }}>
            <Text style={[typography.heading, { color: colors.text }]}>
              Your partner hasn't joined yet
            </Text>
            <Text
              style={[
                typography.body,
                { color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.md },
              ]}
            >
              Share your invitation code so they can join your space.
            </Text>
            <Button
              label="Show invitation"
              variant="secondary"
              onPress={() => router.push('/(app)/invite')}
            />
          </Card>
        ) : null}

        <Card style={{ marginBottom: spacing.lg }}>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            Next up
          </Text>

          {nextEvent ? (
            <View style={{ marginTop: spacing.sm }}>
              <Text style={[typography.heading, { color: colors.text }]}>
                {nextEvent.title}
              </Text>
              <Text
                style={[
                  typography.body,
                  { color: colors.textMuted, marginTop: 2 },
                ]}
              >
                {formatEventRange(nextEvent)}
              </Text>
            </View>
          ) : (
            <Text
              style={[
                typography.body,
                { color: colors.textMuted, marginTop: spacing.sm },
              ]}
            >
              Nothing planned yet. Add something for the two of you.
            </Text>
          )}

          <View style={[styles.actions, { marginTop: spacing.lg }]}>
            <Button
              label="New event"
              variant="secondary"
              onPress={() => router.push('/(app)/event/new')}
              style={{ flex: 1 }}
            />
            <View style={{ width: spacing.sm }} />
            <Button
              label="Message"
              onPress={() => router.push('/(app)/(tabs)/chat')}
              style={{ flex: 1 }}
            />
          </View>
        </Card>

        <View style={styles.sectionHeader}>
          <Text style={[typography.heading, { color: colors.text }]}>
            Coming up
          </Text>
          <Pressable
            onPress={() => router.push('/(app)/(tabs)/calendar')}
            hitSlop={8}
          >
            <Text style={[typography.caption, { color: colors.accent }]}>See all</Text>
          </Pressable>
        </View>

        {upcoming.length === 0 ? (
          <EmptyState
            icon="calendar-outline"
            title="No plans yet"
            description="Events you both create will show up here."
          />
        ) : (
          <View>
            {upcoming.map((event) => (
              <EventRow
                key={event.id}
                event={event}
                onPress={() => router.push(`/(app)/event/${event.id}`)}
                creatorLabel={
                  event.createdBy === userId
                    ? undefined
                    : partner
                      ? 'Them'
                      : undefined
                }
              />
            ))}
          </View>
        )}

        <View style={{ height: spacing.xxl }} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 8,
  },
});
