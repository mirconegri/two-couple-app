import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '../../../src/components/Screen';
import { Card } from '../../../src/components/Card';
import { Button } from '../../../src/components/Button';
import { StatusPill } from '../../../src/components/StatusPill';
import { useAuth } from '../../../src/auth/AuthProvider';
import { useSync } from '../../../src/sync/SyncProvider';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { clearLocalData } from '../../../src/db';
import { unregisterPushToken } from '../../../src/notifications/push';
import { errorMessage } from '../../../src/utils/errors';

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const { colors, spacing, typography } = useTheme();
  const { email, userId, coupleId, members, signOut, refreshCouple } = useAuth();
  const { pendingCount, realtimeStatus, lastSyncedAt, syncing, syncNow } = useSync();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
            await unregisterPushToken();
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

  return (
    <Screen scroll>
      <View style={{ paddingTop: spacing.lg }}>
        <Text style={[typography.title, { color: colors.text, marginBottom: spacing.lg }]}>
          Settings
        </Text>

        <Card style={{ marginBottom: spacing.md }}>
          <Row label="Signed in as" value={email ?? '—'} />
          <Row label="Your space" value={coupleId ? 'Private, 2 members' : 'Not set up'} />
          <Row label="Partner" value={partner ? 'Joined' : 'Waiting to join'} />
          {members.length < 2 ? (
            <Pressable
              onPress={() => router.push('/(app)/invite')}
              style={[
                styles.row,
                {
                  paddingTop: spacing.sm,
                  marginTop: spacing.xs,
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderTopColor: colors.border,
                },
              ]}
              accessibilityRole="button"
            >
              <Text style={[typography.body, { color: colors.accent }]}>
                Invite your partner
              </Text>
              <Ionicons name="chevron-forward" size={18} color={colors.accent} />
            </Pressable>
          ) : null}
        </Card>

        <Card style={{ marginBottom: spacing.md }}>
          <View style={styles.row}>
            <Text style={[typography.body, { color: colors.text }]}>Sync</Text>
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
          </View>

          <Row label="Realtime" value={realtimeStatus} />
          <Row
            label="Last sync"
            value={lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString() : 'Never'}
          />

          <Button
            label="Sync now"
            variant="secondary"
            onPress={handleSync}
            loading={busy}
            style={{ marginTop: spacing.md }}
          />
        </Card>

        <Card style={{ marginBottom: spacing.md }}>
          <Text style={[typography.heading, { color: colors.text, marginBottom: spacing.sm }]}>
            Privacy
          </Text>
          <Text style={[typography.caption, { color: colors.textMuted, lineHeight: 18 }]}>
            Messages are encrypted in transit and at rest by the provider, and the local
            database on this phone is encrypted. They are not end-to-end encrypted: the
            backend operator can technically read message content. Notifications never
            contain message text.
          </Text>
        </Card>

        <Card style={{ marginBottom: spacing.md }}>
          <Text style={[typography.heading, { color: colors.text, marginBottom: spacing.sm }]}>
            If you lose this phone
          </Text>
          <Text style={[typography.caption, { color: colors.textMuted, lineHeight: 18 }]}>
            Sign in on a new phone with the same email and password. Previously synced
            history is downloaded again. The old device stops receiving notifications as
            soon as its token is removed. There is no password reset in this build — keep
            the password somewhere safe.
          </Text>
        </Card>

        <Button label="Clear local data" variant="secondary" onPress={handleClearData} />
        <Button
          label="Sign out"
          variant="danger"
          onPress={handleSignOut}
          style={{ marginTop: spacing.sm }}
        />

        {error ? (
          <Text style={[typography.caption, { color: colors.danger, marginTop: spacing.md }]}>
            {error}
          </Text>
        ) : null}

        <View style={{ height: spacing.xxl }} />
      </View>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const { colors, spacing, typography } = useTheme();
  return (
    <View style={[styles.row, { paddingVertical: spacing.xs }]}>
      <Text style={[typography.caption, { color: colors.textMuted }]}>{label}</Text>
      <Text
        numberOfLines={1}
        style={[typography.caption, { color: colors.text, maxWidth: '60%', textAlign: 'right' }]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
