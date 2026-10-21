import React, { useState } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import * as Clipboard from 'expo-clipboard';

import { Screen } from '../../src/components/Screen';
import { TextField } from '../../src/components/TextField';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { useAuth } from '../../src/auth/AuthProvider';
import { useTheme } from '../../src/theme/ThemeProvider';
import { supabase } from '../../src/lib/supabase';
import { errorMessage } from '../../src/utils/errors';
import { formatInviteCode } from '../../src/utils/invite';

export default function CreateSpaceScreen() {
  const db = useSQLiteContext();
  const { refreshCouple } = useAuth();
  const { colors, spacing, typography } = useTheme();

  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const createSpace = async () => {
    setBusy(true);
    setError(null);
    let id: string | null = null;
    try {
      const { data, error: rpcError } = await supabase.rpc('create_couple', {
        p_name: name.trim() || null,
      });
      if (rpcError) throw new Error(rpcError.message);

      id = typeof data === 'string' ? data : null;
      if (!id) throw new Error('The space was created but no id was returned.');

      setCoupleId(id);
      await refreshCouple(db);
    } catch (caught) {
      setError(errorMessage(caught));
      setBusy(false);
      return;
    }

    try {
      const { data: inviteData, error: inviteError } = await supabase.rpc('create_invitation', {
        p_ttl_hours: 48,
      });
      if (inviteError) throw new Error(inviteError.message);

      const code = typeof inviteData === 'string' ? inviteData : null;
      if (!code) throw new Error('No invitation code was returned.');

      setInviteCode(code);
      setCopied(false);
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
    const formatted = formatInviteCode(inviteCode);
    await Clipboard.setStringAsync(formatted);
    setCopied(true);
  };

  const shareCode = async () => {
    if (!inviteCode) return;
    const formatted = formatInviteCode(inviteCode);
    await Share.share({
      message: `Join our private space in Two.\n\nInvitation code:\n${formatted}\n\nThis code works once and expires in 48 hours.`,
    });
  };

  if (inviteCode) {
    const formatted = formatInviteCode(inviteCode);

    return (
      <Screen scroll>
        <View style={{ paddingTop: spacing.xxxl }}>
          <Text style={[typography.title, { color: colors.text }]}>
            Invite your partner
          </Text>
          <Text
            style={[
              typography.body,
              { color: colors.textMuted, marginTop: spacing.sm, marginBottom: spacing.xl },
            ]}
          >
            Share this invitation code with your partner so they can join your space.
          </Text>

          <Card>
            <Text
              selectable
              style={[
                typography.bodyStrong,
                {
                  color: colors.text,
                  fontFamily: undefined,
                  letterSpacing: 0.6,
                  textAlign: 'center',
                },
              ]}
            >
              {formatted}
            </Text>
          </Card>

          <Text
            style={[
              typography.caption,
              { color: colors.textMuted, marginTop: spacing.md, textAlign: 'center' },
            ]}
          >
            Expires in 48 hours
          </Text>

          <Text
            style={[
              typography.caption,
              {
                color: colors.textFaint,
                marginTop: spacing.xs,
                marginBottom: spacing.lg,
                textAlign: 'center',
              },
            ]}
          >
            This code is shown only once. If you lose it, generate a new one from Settings.
          </Text>

          <Button
            label={copied ? 'Copied' : 'Copy code'}
            variant="secondary"
            onPress={copyCode}
            style={{ marginTop: spacing.sm }}
          />
          <Button
            label="Share"
            variant="secondary"
            onPress={shareCode}
            style={{ marginTop: spacing.sm }}
          />

          {error ? (
            <Text
              style={[
                typography.caption,
                { color: colors.danger, marginTop: spacing.md },
              ]}
            >
              {error}
            </Text>
          ) : null}

          <Button
            label="Continue"
            variant="primary"
            onPress={() => router.replace('/(app)/(tabs)')}
            style={{ marginTop: spacing.xl }}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View style={{ paddingTop: spacing.xxxl }}>
        <Text style={[typography.title, { color: colors.text }]}>Create the space</Text>
        <Text
          style={[
            typography.body,
            { color: colors.textMuted, marginTop: spacing.sm, marginBottom: spacing.xxl },
          ]}
        >
          Give it a name if you like. Only the two of you will ever see it.
        </Text>

        <TextField
          label="Space name (optional)"
          value={name}
          onChangeText={setName}
          placeholder="Us"
          maxLength={60}
          error={error}
        />

        {coupleId ? (
          <Button
            label="Generate invitation code"
            onPress={generateInvite}
            loading={busy}
          />
        ) : (
          <Button label="Create our space" onPress={createSpace} loading={busy} />
        )}

        {coupleId ? (
          <Text
            style={[
              typography.caption,
              { color: colors.textMuted, marginTop: spacing.md },
            ]}
          >
            Space created. Generate a code to invite your partner.
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({});
