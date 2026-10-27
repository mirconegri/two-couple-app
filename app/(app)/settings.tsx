import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '../../src/components/Screen';
import { ListSection } from '../../src/components/ListSection';
import { ListRow } from '../../src/components/ListRow';
import { StatusPill } from '../../src/components/StatusPill';
import { NavBarButton } from '../../src/components/NavBarButton';
import { SegmentedControl } from '../../src/components/SegmentedControl';
import { PressableScale } from '../../src/components/PressableScale';
import { useAuth } from '../../src/auth/AuthProvider';
import { useSync } from '../../src/sync/SyncProvider';
import { useTheme } from '../../src/theme/ThemeProvider';
import { accents, accentKeys } from '../../src/theme/preferences';
import { clearLocalData, getMeta } from '../../src/db';
import { unregisterPushToken } from '../../src/notifications/push';
import { ensureNotificationPermission } from '../../src/notifications/reminders';
import { errorMessage } from '../../src/utils/errors';

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const { colors, spacing, typography, scheme, prefs, updatePrefs } = useTheme();
  const { email, userId, coupleId, members, signOut, refreshCouple } = useAuth();
  const { pendingCount, realtimeStatus, lastSyncedAt, syncing, syncNow } = useSync();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pushStatus, setPushStatus] = useState<string>('Checking…');

  useEffect(() => {
    void getMeta(db, 'push_token_status').then((val) => {
      setPushStatus(val || 'Not registered');
    });
  }, [db]);

  const me = members.find((member) => member.userId === userId);
  const partner = members.find((member) => member.userId !== userId);

  const handleSync = async () => {
    setBusy(true);
    const result = await syncNow();
    setError(result?.error ?? null);
    setBusy(false);
  };

  const handleSignOut = () => {
    Alert.alert('Sign out?', 'Your local data stays on this phone until you clear it.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await unregisterPushToken(db);
            await signOut();
          })();
        },
      },
    ]);
  };

  const handleClearData = () => {
    Alert.alert(
      'Delete local data?',
      'Messages and events cached on this phone will be removed. Anything not yet synced will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await clearLocalData(db);
                await refreshCouple(db);
              } catch (caught) {
                setError(errorMessage(caught));
              }
            })();
          },
        },
      ],
    );
  };

  const handleTestNotification = async () => {
    try {
      const granted = await ensureNotificationPermission();
      if (!granted) {
        Alert.alert('Permission required', 'Please enable notifications in system settings.');
        return;
      }
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Two',
          body: 'Notifications are working properly!',
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes?.DATE ?? 'date',
          date: new Date(Date.now() + 3000),
          channelId: 'messages',
        },
      });
      Alert.alert('Test scheduled', 'A notification will appear in 3 seconds.');
    } catch (caught) {
      Alert.alert('Test failed', errorMessage(caught));
    }
  };

  return (
    <Screen scroll>
      <View style={{ paddingTop: spacing.md, paddingBottom: spacing.xxxl }}>
        {/* Navigation header */}
        <View style={styles.navHeader}>
          <NavBarButton
            icon="chevron-back"
            label="Home"
            onPress={() => router.back()}
          />
        </View>

        {/* Large Title */}
        <Text style={[typography.largeTitle, { color: colors.text, marginBottom: spacing.lg }]}>
          Settings
        </Text>

        {/* Profile & Space Section */}
        <ListSection title="Space & Profile">
          <ListRow
            label="Your name"
            value={me?.displayName ?? 'Not set'}
            icon="person"
            iconBg={colors.accent}
            chevron
            onPress={() => router.push('/(app)/profile')}
          />
          <ListRow
            label="Signed in as"
            value={email ?? '—'}
            icon="mail"
            iconBg="#8E8E93"
          />
          <ListRow
            label="Your space"
            value={coupleId ? 'Active (2 members)' : 'Not set up'}
            icon="heart"
            iconBg="#FF2D55"
          />
          <ListRow
            label="Partner"
            value={partner ? (partner.displayName || 'Joined') : 'Waiting to join'}
            icon="people"
            iconBg="#AF52DE"
          />
          {members.length < 2 ? (
            <ListRow
              label="Invite your partner"
              icon="person-add"
              iconBg="#34C759"
              chevron
              onPress={() => router.push('/(app)/invite')}
            />
          ) : null}
        </ListSection>

        {/* Appearance Section */}
        <ListSection title="Aspetto">
          <View style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.md }}>
            <SegmentedControl
              options={[
                { value: 'auto', label: 'Auto' },
                { value: 'light', label: 'Chiaro' },
                { value: 'dark', label: 'Scuro' },
              ]}
              value={prefs.mode}
              onChange={(mode) => updatePrefs({ mode })}
            />
          </View>
          <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
            <Text
              style={[
                typography.subheadline,
                { color: colors.textMuted, marginBottom: spacing.sm },
              ]}
            >
              Colore accento
            </Text>
            <View style={styles.swatchRow}>
              {accentKeys.map((key) => {
                const isSelected = prefs.accent === key;
                const accentDef = accents[key];
                const swatchBg = scheme === 'dark' ? accentDef.dark : accentDef.light;

                return (
                  <PressableScale
                    key={key}
                    onPress={() => updatePrefs({ accent: key })}
                    haptics="selection"
                    scaleTo={0.92}
                    accessibilityRole="button"
                    accessibilityLabel={accentDef.label}
                    accessibilityState={{ selected: isSelected }}
                    style={[
                      styles.accentSwatch,
                      {
                        backgroundColor: swatchBg,
                        borderColor: isSelected ? colors.text : colors.border,
                        borderWidth: isSelected ? 2 : 1,
                      },
                    ]}
                  >
                    {isSelected ? (
                      <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                    ) : null}
                  </PressableScale>
                );
              })}
            </View>
          </View>
        </ListSection>

        {/* Sync Section */}
        <ListSection title="Sync & Storage">
          <ListRow
            label="Status"
            icon="sync"
            iconBg={colors.accent}
            rightAction={
              <StatusPill
                label={
                  syncing
                    ? 'Syncing'
                    : pendingCount > 0
                      ? `${pendingCount} pending`
                      : 'Up to date'
                }
                tone={pendingCount > 0 ? 'pending' : 'success'}
              />
            }
          />
          <ListRow
            label="Realtime"
            value={realtimeStatus}
            icon="cloud"
            iconBg="#5856D6"
          />
          <ListRow
            label="Last sync"
            value={lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}
            icon="time"
            iconBg="#FF9500"
          />
          <ListRow
            label={busy ? 'Syncing…' : 'Sync now'}
            onPress={handleSync}
            disabled={busy}
          />
        </ListSection>

        {/* Notifications Section */}
        <ListSection title="Notifications">
          <ListRow
            label="Push notifications"
            value={pushStatus}
            icon="notifications"
            iconBg="#FF3B30"
          />
          <ListRow
            label="Send test notification"
            onPress={handleTestNotification}
          />
        </ListSection>

        {/* Privacy & Safety */}
        <ListSection
          title="Data & Privacy"
          footer="Messages and calendar entries are synced between your two phones and stored locally in an encrypted database. Sign in on a new device anytime to recover synced content."
        >
          <ListRow
            label="Clear local data"
            destructive
            onPress={handleClearData}
          />
        </ListSection>

        {/* Sign Out */}
        <ListSection>
          <ListRow
            label="Sign out"
            destructive
            onPress={handleSignOut}
          />
        </ListSection>

        {error ? (
          <Text style={[typography.footnote, { color: colors.danger, textAlign: 'center', marginTop: spacing.sm }]}>
            {error}
          </Text>
        ) : null}

        <Text
          style={[
            typography.footnote,
            { color: colors.textFaint, textAlign: 'center', marginTop: spacing.md },
          ]}
        >
          Two • Private space for two
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  swatchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accentSwatch: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
