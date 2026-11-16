import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { Screen } from '../../src/components/Screen';
import { TextField } from '../../src/components/TextField';
import { Button } from '../../src/components/Button';
import { Text } from '../../src/components/Text';
import { TopAppBar } from '../../src/components/TopAppBar';
import { useAuth } from '../../src/auth/AuthProvider';
import { useHaptics } from '../../src/lib/haptics';
import { supabase } from '../../src/lib/supabase';
import { errorMessage } from '../../src/utils/errors';
import { spacing } from '../../src/theme/tokens';

export default function ProfileScreen() {
  const db = useSQLiteContext();
  const { userId, members, refreshCouple } = useAuth();
  const haptics = useHaptics();

  const [name, setName] = useState(
    () => members.find((member) => member.userId === userId)?.displayName ?? '',
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const { error: rpcError } = await supabase.rpc('set_display_name', {
        p_name: name.trim() || null,
      });
      if (rpcError) throw new Error(rpcError.message);

      await refreshCouple(db);
      haptics.confirm();
      router.back();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <TopAppBar title="Your name" onBack={() => router.back()} />
      <Screen scroll contentStyle={styles.content}>
        <Text variant="bodyLarge" color="onSurfaceVariant" style={styles.subtitle}>
          Choose what your partner sees in chat, shared events, and notes.
        </Text>

        <TextField
          label="Display name"
          value={name}
          onChangeText={setName}
          maxLength={40}
          autoFocus
          error={error}
        />

        <Button
          label="Save"
          onPress={save}
          size="medium"
          fullWidth
          loading={busy}
          disabled={name.trim().length === 0}
          style={styles.action}
        />
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.lg, paddingBottom: spacing.xxxl },
  subtitle: { marginBottom: spacing.xxl },
  action: { marginTop: spacing.xl },
});
