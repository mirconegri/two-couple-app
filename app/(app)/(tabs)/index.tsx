import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { addDays, format, isAfter, isBefore } from 'date-fns';
import Animated, {
  FadeIn,
  FadeInUp,
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';

import { Screen } from '../../../src/components/Screen';
import { Card } from '../../../src/components/Card';
import { EventRow } from '../../../src/components/EventRow';
import { EmptyState } from '../../../src/components/EmptyState';
import { Button } from '../../../src/components/Button';
import { Text } from '../../../src/components/Text';
import { TopAppBar } from '../../../src/components/TopAppBar';
import { IconButton } from '../../../src/components/IconButton';
import { Fab } from '../../../src/components/Fab';
import { useAuth } from '../../../src/auth/AuthProvider';
import { useEvents } from '../../../src/hooks/useEvents';
import { useSync } from '../../../src/sync/SyncProvider';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { useSettings } from '../../../src/settings/SettingsProvider';
import { formatEventRange } from '../../../src/utils/date';
import { duration } from '../../../src/theme/motion';
import { iconSize, spacing } from '../../../src/theme/tokens';

export default function HomeScreen() {
  const { colors, reducedMotion } = useTheme();
  const { settings } = useSettings();
  const { members, userId } = useAuth();
  const { events } = useEvents();
  const { pendingCount, syncing } = useSync();

  const partner = members.find((member) => member.userId !== userId);
  const me = members.find((member) => member.userId === userId);

  const upcoming = useMemo(() => {
    const now = new Date();
    const horizon = addDays(now, 30);

    return events
      .filter((event) => !event.deletedAt)
      .filter((event) => {
        if (event.allDay && event.startsOn) {
          const [y, m, d] = event.startsOn.split('-').map(Number);
          if (!y || !m || !d) return false;
          return isAfter(new Date(y, m - 1, d, 23, 59), now) && isBefore(new Date(y, m - 1, d, 23, 59), horizon);
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
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const entrance = (index: number) =>
    reducedMotion
      ? FadeIn.duration(duration.short3).delay(index * 40)
      : FadeInUp.duration(duration.medium1).delay(index * 60);

  return (
    <View style={styles.root}>
      <TopAppBar
        title={me?.displayName ? `Hello, ${me.displayName}` : 'Two'}
        scrollY={scrollY}
        actions={
          <IconButton
            icon="settings-outline"
            onPress={() => router.push('/(app)/settings')}
            accessibilityLabel="Settings"
          />
        }
      />

      <Screen scroll onScroll={scrollHandler} contentStyle={styles.content}>
        <Text variant="labelLarge" color="onSurfaceVariant" style={styles.date}>
          {format(new Date(), 'EEEE, d MMMM').toUpperCase()}
        </Text>

        {members.length < 2 ? (
          <Animated.View entering={entrance(0)}>
            <Card variant="filled" style={styles.block}>
              <View style={styles.cardHead}>
                <Ionicons name="person-add" size={iconSize.md} color={colors.primary} />
                <Text variant="titleMedium" strong style={styles.cardTitle}>
                  Your partner hasn&apos;t joined yet
                </Text>
              </View>
              <Text variant="bodyMedium" color="onSurfaceVariant" style={styles.cardBody}>
                Share your invitation code so they can join your private space.
              </Text>
              <Button
                label="Show invitation"
                variant="tonal"
                onPress={() => router.push('/(app)/invite')}
              />
            </Card>
          </Animated.View>
        ) : null}

        {!me?.displayName ? (
          <Animated.View entering={entrance(1)}>
            <Card variant="filled" style={styles.block}>
              <Text variant="titleMedium" strong>
                What should your partner call you?
              </Text>
              <Text variant="bodyMedium" color="onSurfaceVariant" style={styles.cardBody}>
                Set a display name so your partner knows who sent messages and added events.
              </Text>
              <Button
                label="Set your name"
                variant="tonal"
                onPress={() => router.push('/(app)/profile')}
              />
            </Card>
          </Animated.View>
        ) : null}

        <Animated.View entering={entrance(2)}>
          <Card variant="elevated" style={styles.block}>
            <View style={styles.cardHead}>
              <Text variant="labelLarge" color="primary">
                NEXT UP
              </Text>
              <Text variant="labelMedium" color="onSurfaceVariant">
                {syncing ? 'Syncing…' : pendingCount > 0 ? `${pendingCount} waiting` : 'Synced'}
              </Text>
            </View>

            {nextEvent ? (
              <>
                <Text variant="headlineSmall" strong style={styles.nextTitle}>
                  {nextEvent.title}
                </Text>
                <Text variant="bodyMedium" color="onSurfaceVariant">
                  {formatEventRange(nextEvent, settings.use24Hour)}
                </Text>
              </>
            ) : (
              <Text variant="bodyMedium" color="onSurfaceVariant" style={styles.nextTitle}>
                Nothing planned yet. Add something for the two of you.
              </Text>
            )}

            <View style={styles.actions}>
              <Button
                label="New event"
                icon="add"
                variant="tonal"
                onPress={() => router.push('/(app)/event/new')}
                style={styles.action}
              />
              <Button
                label="Chat"
                icon="chatbubble-ellipses"
                onPress={() => router.push('/(app)/(tabs)/chat')}
                style={styles.action}
              />
            </View>
          </Card>
        </Animated.View>

        <Animated.View entering={entrance(3)}>
          <View style={styles.sectionHeader}>
            <Text variant="titleLarge" strong>
              Coming up
            </Text>
            <Button
              label="See all"
              variant="text"
              onPress={() => router.push('/(app)/(tabs)/calendar')}
            />
          </View>

          {upcoming.length === 0 ? (
            <EmptyState
              icon="calendar-outline"
              title="No upcoming events"
              description="Events you both create will show up here."
            />
          ) : (
            <View style={styles.list}>
              {upcoming.map((event) => (
                <EventRow
                  key={event.id}
                  event={event}
                  onPress={() => router.push(`/(app)/event/${event.id}`)}
                  creatorLabel={
                    event.createdBy === userId ? undefined : partner?.displayName || 'Partner'
                  }
                />
              ))}
            </View>
          )}
        </Animated.View>
      </Screen>

      <Fab
        icon="add"
        label="Event"
        onPress={() => router.push('/(app)/event/new')}
        accessibilityLabel="New event"
        style={styles.fab}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingTop: spacing.lg, paddingBottom: 96 },
  date: { marginBottom: spacing.lg },
  block: { marginBottom: spacing.lg },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { flex: 1, marginLeft: spacing.sm },
  cardBody: { marginTop: spacing.xs, marginBottom: spacing.lg },
  nextTitle: { marginTop: spacing.sm, marginBottom: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  action: { flex: 1 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  list: { gap: spacing.sm },
  fab: { position: 'absolute', right: spacing.lg, bottom: spacing.lg },
});
