import React, { useCallback, useEffect, useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '../../src/components/Screen';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { Text } from '../../src/components/Text';
import { TopAppBar } from '../../src/components/TopAppBar';
import { useAuth } from '../../src/auth/AuthProvider';
import { useTheme } from '../../src/theme/ThemeProvider';
import { supabase } from '../../src/lib/supabase';
import { errorMessage } from '../../src/utils/errors';
import { formatInviteCode } from '../../src/utils/invite';
import { iconSize, spacing } from '../../src/theme/tokens';

export default function InviteScreen() {
  const db = useSQLiteContext();
  const { colors } = useTheme();
  const { coupleId, members, userId, refreshCouple } = useAuth();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [invitationId, setInvitationId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void refreshCouple(db);
  }, [db, refreshCouple]);

  const loadActiveInvitationId = useCallback(async () => {
    if (!coupleId) return;
    try {
      const { data, error: queryError } = await supabase
        .from('invitations')
        .select('id')
        .eq('couple_id', coupleId)
        .is('used_at', null)
        .is('revoked_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      const first = data?.[0];
      setInvitationId(!queryError && first ? first.id : null);
    } catch {
      setInvitationId(null);
    }
  }, [coupleId]);

  useEffect(() => {
    void loadActiveInvitationId();
  }, [loadActiveInvitationId]);

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
      await loadActiveInvitationId();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const revokeInvite = async () => {
    if (!invitationId) {
      setInviteCode(null);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const { error: rpcError } = await supabase.rpc('revoke_invitation', { p_id: invitationId });
      if (rpcError) throw new Error(rpcError.message);

      setInviteCode(null);
      setInvitationId(null);
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

  const partner = members.find((member) => member.userId !== userId);
  const partnerLabel = partner?.displayName || partner?.email || 'your partner';
  const isComplete = members.length >= 2;

  return (
    <>
      <TopAppBar title="Invite" onBack={() => router.back()} />
      <Screen scroll contentStyle={styles.content}>
        {isComplete ? (
          <>
            <View style={[styles.mark, { backgroundColor: colors.secondaryContainer }]}>
              <Ionicons name="checkmark" size={iconSize.lg} color={colors.onSecondaryContainer} />
            </View>
            <Text variant="headlineMedium" strong style={styles.centered}>
              Your space is complete
            </Text>
            <Text variant="bodyLarge" color="onSurfaceVariant" style={styles.centered}>
              {partnerLabel} has joined. Nobody else can get in.
            </Text>
          </>
        ) : (
          <>
            <Text variant="headlineMedium" strong>
              Invite your partner
            </Text>
            <Text variant="bodyLarge" color="onSurfaceVariant" style={styles.subtitle}>
              Share an invitation code. Once they join, your space is locked to the two of you.
            </Text>

            {inviteCode ? (
              <>
                <Card variant="filled">
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
                  This code is shown only once. If you lose it, generate a new one.
                </Text>

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
                  {invitationId ? (
                    <Button
                      label="Revoke code"
                      variant="danger"
                      onPress={revokeInvite}
                      loading={busy}
                      fullWidth
                    />
                  ) : null}
                </View>
              </>
            ) : (
              <>
                <Button
                  label="Generate invitation code"
                  onPress={generateInvite}
                  size="medium"
                  fullWidth
                  loading={busy}
                />

                {invitationId ? (
                  <>
                    <Text variant="bodyMedium" color="onSurfaceVariant" style={styles.note}>
                      An active code already exists for this space. Generate a new one to share it
                      again, or revoke the existing one.
                    </Text>
                    <Button
                      label="Revoke existing code"
                      variant="danger"
                      onPress={revokeInvite}
                      loading={busy}
                      fullWidth
                    />
                  </>
                ) : null}
              </>
            )}

            {error ? (
              <Text variant="bodySmall" color="error" style={styles.error}>
                {error}
              </Text>
            ) : null}
          </>
        )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.lg, paddingBottom: spacing.xxxl },
  subtitle: { marginTop: spacing.sm, marginBottom: spacing.xxl },
  mark: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  code: { textAlign: 'center', letterSpacing: 1.5 },
  centered: { textAlign: 'center', marginTop: spacing.sm },
  actions: { gap: spacing.sm, marginTop: spacing.xl },
  note: { marginTop: spacing.xl, marginBottom: spacing.md },
  error: { marginTop: spacing.md, textAlign: 'center' },
});
