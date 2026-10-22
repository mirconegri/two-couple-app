import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '../../src/components/Screen';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { NavBarButton } from '../../src/components/NavBarButton';
import { useAuth } from '../../src/auth/AuthProvider';
import { useTheme } from '../../src/theme/ThemeProvider';
import { supabase } from '../../src/lib/supabase';
import { errorMessage } from '../../src/utils/errors';
import { formatInviteCode } from '../../src/utils/invite';

export default function InviteScreen() {
  const db = useSQLiteContext();
  const { colors, spacing, typography } = useTheme();
  const { coupleId, members, userId, refreshCouple } = useAuth();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [invitationId, setInvitationId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch the current couple's members on mount.
  useEffect(() => {
    void refreshCouple(db);
  }, [db, refreshCouple]);

  // Check for any active unrevoked invitation if we don't have a code in memory.
  const loadActiveInvitationId = useCallback(async () => {
    if (!coupleId) return;
    try {
      const { data, error: invError } = await supabase
        .from('invitations')
        .select('id')
        .eq('couple_id', coupleId)
        .is('used_at', null)
        .is('revoked_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      const first = data?.[0];
      if (!invError && first) {
        setInvitationId(first.id);
      } else {
        setInvitationId(null);
      }
    } catch {
      // Best effort check
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

      if (coupleId) {
        const { data: invRows } = await supabase
          .from('invitations')
          .select('id')
          .eq('couple_id', coupleId)
          .is('used_at', null)
          .is('revoked_at', null)
          .order('created_at', { ascending: false })
          .limit(1);

        const firstInv = invRows?.[0];
        if (firstInv) {
          setInvitationId(firstInv.id);
        }
      }
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
      const { error: rpcError } = await supabase.rpc('revoke_invitation', {
        p_id: invitationId,
      });
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

  const isComplete = members.length >= 2;
  const partner = members.find((member) => member.userId !== userId);
  const partnerLabel = partner?.email || partner?.displayName || 'your partner';

  return (
    <Screen scroll>
      <View style={{ paddingTop: spacing.md, paddingBottom: spacing.xxxl }}>
        <View style={styles.headerRow}>
          <NavBarButton
            icon="chevron-back"
            label="Back"
            onPress={() => router.back()}
          />
        </View>

        <Text
          style={[
            typography.largeTitle,
            { color: colors.text, marginTop: spacing.xs, marginBottom: spacing.sm },
          ]}
        >
          Invite Your Partner
        </Text>

        {isComplete ? (
          <Card style={{ marginTop: spacing.xl, paddingVertical: spacing.xl }}>
            <View style={styles.center}>
              <Ionicons name="checkmark-circle-outline" size={56} color={colors.success} />
              <Text
                style={[
                  typography.title,
                  { color: colors.text, textAlign: 'center', marginTop: spacing.md },
                ]}
              >
                Your space is complete
              </Text>
              <Text
                style={[
                  typography.body,
                  {
                    color: colors.textMuted,
                    textAlign: 'center',
                    marginTop: spacing.sm,
                  },
                ]}
              >
                Your space is complete — {partnerLabel} has joined
              </Text>
            </View>
          </Card>
        ) : (
          <View style={{ marginTop: spacing.xl }}>
            <Text
              style={[
                typography.body,
                { color: colors.textMuted, marginBottom: spacing.lg },
              ]}
            >
              Share an invitation code with your partner. Once they join, your space
              is complete and locked to the two of you.
            </Text>

            {inviteCode ? (
              <View>
                <Card>
                  <Text
                    selectable
                    style={[
                      typography.bodyStrong,
                      {
                        color: colors.text,
                        letterSpacing: 0.6,
                        textAlign: 'center',
                      },
                    ]}
                  >
                    {formatInviteCode(inviteCode)}
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

                {invitationId ? (
                  <Button
                    label="Revoke"
                    variant="danger"
                    onPress={revokeInvite}
                    loading={busy}
                    style={{ marginTop: spacing.md }}
                  />
                ) : null}
              </View>
            ) : (
              <View>
                <Button
                  label="Generate new invitation code"
                  variant="primary"
                  onPress={generateInvite}
                  loading={busy}
                />

                {invitationId ? (
                  <View style={{ marginTop: spacing.xl }}>
                    <Text
                      style={[
                        typography.caption,
                        { color: colors.textMuted, marginBottom: spacing.sm },
                      ]}
                    >
                      An active invitation code exists for this space. Generating a new
                      code will let you share it again, or you can revoke the existing one.
                    </Text>
                    <Button
                      label="Revoke"
                      variant="danger"
                      onPress={revokeInvite}
                      loading={busy}
                    />
                  </View>
                ) : null}
              </View>
            )}

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
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
