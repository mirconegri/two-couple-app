import React, { useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import * as Clipboard from 'expo-clipboard';

import { Screen } from '../../src/components/Screen';
import { TextField } from '../../src/components/TextField';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { Text } from '../../src/components/Text';
import { TopAppBar } from '../../src/components/TopAppBar';
import { useAuth } from '../../src/auth/AuthProvider';
import { useTheme } from '../../src/theme/ThemeProvider';
import { supabase } from '../../src/lib/supabase';
import { spacing } from '../../src/theme/tokens';
import { errorMessage } from '../../src/utils/errors';
import { formatInviteCode } from '../../src/utils/invite';

export default function CreateSpaceScreen() {
  const db = useSQLiteContext();
  const { refreshCouple } = useAuth();
  const { colors } = useTheme();

  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const createSpace = async () => {
    setBusy(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('create_couple', {
        p_name: name.trim() || null,
      });
      if (rpcError) throw new Error(rpcError.message);

      const id = typeof data === 'string' ? data : null;
      if (!id) throw new Error('The space was created but no id was returned.');

      setCoupleId(id);
      await refreshCouple(db);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const generateInvite = async () => {
    setBusy(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('create_invitation', {
        p_ttl_hours: 48,
      });
      if (rpcError) throw new Error(rpcError.message);

      const code = typeof data === 'string' ? data : null;
      if (!code) throw new Error('No invitation code was returned.');

      setInviteCode(code);
      setCopied(false);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const copyCode = async () => {
    if (!inviteCode) return;
    await Clipboard.setStringAsync(formatInviteCode(inviteCode));
    setCopied(true);
  };

  const shareCode = async () => {
    if (!inviteCode) return;
    await Share.share({
      message: `Join our private space in Two.\n\nInvitation code:\n${formatInviteCode(inviteCode)}\n\nThis code works once and expires in 48 hours.`,
    });
  };

  if (inviteCode) {
    return (
      <>
        <TopAppBar title="Invite your partner" />
        <Screen scroll contentStyle={styles.content}>
          <Text variant="headlineMedium" strong>
            Invite your partner
          </Text>
          <Text variant="bodyLarge" color="onSurfaceVariant" style={styles.subtitle}>
            Share this invitation code with your partner so they can join your space.
          </Text>

          <Card variant="filled" style={styles.codeCard}>
            <Text
              selectable
              variant="headlineSmall"
              strong
              style={[styles.code, { color: colors.onSurface }]}
            >
              {formatInviteCode(inviteCode)}
            </Text>
          </Card>

          <Text variant="bodyMedium" color="onSurfaceVariant" style={styles.centered}>
            Expires in 48 hours
          </Text>
          <Text variant="bodySmall" color="onSurfaceVariant" style={styles.centered}>
            This code is shown only once. If you lose it, generate a new one from Settings.
          </Text>

          {error ? (
            <Text variant="bodySmall" color="error" style={styles.error}>
              {error}
            </Text>
          ) : null}

          <View style={styles.actions}>
            <Button
              label={copied ? 'Copied' : 'Copy code'}
              icon={copied ? 'checkmark' : 'copy'}
              variant="tonal"
              onPress={copyCode}
              fullWidth
            />
            <Button
              label="Share"
              icon="share-outline"
              variant="outlined"
              onPress={shareCode}
              fullWidth
            />
          </View>

          <Button
            label="Continue"
            onPress={() => router.replace('/(app)/(tabs)')}
            size="medium"
            fullWidth
            style={styles.continue}
          />
        </Screen>
      </>
    );
  }

  return (
    <>
      <TopAppBar title="Create the space" onBack={() => router.back()} />
      <Screen scroll contentStyle={styles.content}>
        <Text variant="headlineMedium" strong>
          Create the space
        </Text>
        <Text variant="bodyLarge" color="onSurfaceVariant" style={styles.subtitle}>
          Give it a name if you like. Only the two of you will ever see it.
        </Text>

        <TextField
          label="Space name (optional)"
          value={name}
          onChangeText={setName}
          maxLength={60}
          error={error}
        />

        <View style={styles.actions}>
          {coupleId ? (
            <Button
              label="Generate invitation code"
              onPress={generateInvite}
              size="medium"
              fullWidth
              loading={busy}
            />
          ) : (
            <Button
              label="Create our space"
              onPress={createSpace}
              size="medium"
              fullWidth
              loading={busy}
            />
          )}
        </View>

        {coupleId ? (
          <Text variant="bodyMedium" color="onSurfaceVariant" style={styles.note}>
            Space created. Generate a code to invite your partner.
          </Text>
        ) : null}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.lg, paddingBottom: spacing.xxxl },
  subtitle: { marginTop: spacing.sm, marginBottom: spacing.xxl },
  codeCard: { paddingVertical: spacing.xl },
  code: { textAlign: 'center', letterSpacing: 1.5 },
  centered: { textAlign: 'center', marginTop: spacing.sm },
  error: { marginTop: spacing.md, textAlign: 'center' },
  actions: { gap: spacing.sm, marginTop: spacing.xl },
  continue: { marginTop: spacing.xl },
  note: { marginTop: spacing.md },
});
