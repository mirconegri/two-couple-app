import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { addDays, format, isAfter, isBefore } from 'date-fns';

import { Screen } from '../../../src/components/Screen';
import { Card } from '../../../src/components/Card';
import { EventRow } from '../../../src/components/EventRow';
import { EmptyState } from '../../../src/components/EmptyState';
import { Button } from '../../../src/components/Button';
import { NavBarButton } from '../../../src/components/NavBarButton';
import { useAuth } from '../../../src/auth/AuthProvider';
import { useEvents } from '../../../src/hooks/useEvents';
import { useSync } from '../../../src/sync/SyncProvider';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { formatEventRange } from '../../../src/utils/date';

export default function HomeScreen() {
  const { colors, spacing, typography, radii } = useTheme();
  const { members, userId } = useAuth();
  const { events } = useEvents();
  const { pendingCount, syncing, lastSyncedAt } = useSync();

  const partner = members.find((member) => member.userId !== userId);
  const me = members.find((member) => member.userId === userId);
  const hasName = Boolean(me?.displayName);

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
  const todayLabel = format(new Date(), 'EEEE, d MMMM');

  return (
    <Screen scroll>
      <View style={{ paddingTop: spacing.md, paddingBottom: spacing.xxxl }}>
        {/* Top Header Bar */}
        <View style={styles.topBar}>
          <Text style={[typography.footnote, { color: colors.textMuted, textTransform: 'uppercase' }]}>
            {todayLabel}
          </Text>
          <NavBarButton
            icon="settings-outline"
            onPress={() => router.push('/(app)/settings')}
          />
        </View>

        {/* Large Title */}
        <Text
          style={[
            typography.largeTitle,
            { color: colors.text, marginTop: spacing.xxs, marginBottom: spacing.lg },
          ]}
        >
          {me?.displayName ? `Hello, ${me.displayName}` : 'Two'}
        </Text>

        {/* Partner Invite Banner */}
        {members.length < 2 ? (
          <Card style={{ marginBottom: spacing.lg, borderColor: colors.accent }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
              <Ionicons name="person-add-outline" size={20} color={colors.accent} style={{ marginRight: spacing.xs }} />
              <Text style={[typography.headline, { color: colors.text }]}>
                Your partner hasn't joined yet
              </Text>
            </View>
            <Text
              style={[
                typography.subheadline,
                { color: colors.textMuted, marginBottom: spacing.md },
              ]}
            >
              Share your invitation code so they can join your private space.
            </Text>
            <Button
              label="Show invitation"
              variant="secondary"
              onPress={() => router.push('/(app)/invite')}
            />
          </Card>
        ) : null}

        {/* Profile Name Prompt */}
        {!hasName ? (
          <Card style={{ marginBottom: spacing.lg }}>
            <Text style={[typography.headline, { color: colors.text }]}>
              What should your partner call you?
            </Text>
            <Text
              style={[
                typography.subheadline,
                { color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.md },
              ]}
            >
              Set a display name so your partner knows who sent messages and added events.
            </Text>
            <Button
              label="Set your name"
              variant="secondary"
              onPress={() => router.push('/(app)/profile')}
            />
          </Card>
        ) : null}

        {/* Next Up Widget Card */}
        <Card style={{ marginBottom: spacing.xl }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={[typography.footnote, { color: colors.textMuted, textTransform: 'uppercase' }]}>
              Next up
            </Text>
            <Text style={[typography.caption2, { color: colors.textFaint }]}>
              {syncing
                ? 'Syncing…'
                : pendingCount > 0
                  ? `${pendingCount} waiting`
                  : 'Synced'}
            </Text>
          </View>

          {nextEvent ? (
            <View style={{ marginTop: spacing.sm }}>
              <Text style={[typography.title2, { color: colors.text }]}>
                {nextEvent.title}
              </Text>
              <Text
                style={[
                  typography.subheadline,
                  { color: colors.textMuted, marginTop: spacing.xxs },
                ]}
              >
                {formatEventRange(nextEvent)}
              </Text>
            </View>
          ) : (
            <Text
              style={[
                typography.subheadline,
                { color: colors.textMuted, marginTop: spacing.sm },
              ]}
            >
              Nothing planned for today. Add something for the two of you.
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
              label="Chat"
              onPress={() => router.push('/(app)/(tabs)/chat')}
              style={{ flex: 1 }}
            />
          </View>
        </Card>

        {/* Upcoming Events List */}
        <View style={styles.sectionHeader}>
          <Text style={[typography.title3, { color: colors.text }]}>
            Coming up
          </Text>
          <Pressable
            onPress={() => router.push('/(app)/(tabs)/calendar')}
            hitSlop={8}
          >
            <Text style={[typography.subheadline, { color: colors.accent }]}>See all</Text>
          </Pressable>
        </View>

        {upcoming.length === 0 ? (
          <EmptyState
            icon="calendar-outline"
            title="No upcoming events"
            description="Events you both create will show up here."
          />
        ) : (
          <View style={{ marginTop: spacing.xs }}>
            {upcoming.map((event) => (
              <EventRow
                key={event.id}
                event={event}
                onPress={() => router.push(`/(app)/event/${event.id}`)}
                creatorLabel={
                  event.createdBy === userId
                    ? undefined
                    : (partner?.displayName || 'Partner')
                }
              />
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 32,
  },
  actions: {
    flexDirection: 'row',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
});
