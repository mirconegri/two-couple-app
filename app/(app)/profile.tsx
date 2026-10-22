import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { Screen } from '../../src/components/Screen';
import { TextField } from '../../src/components/TextField';
import { Button } from '../../src/components/Button';
import { NavBarButton } from '../../src/components/NavBarButton';
import { useAuth } from '../../src/auth/AuthProvider';
import { useTheme } from '../../src/theme/ThemeProvider';
import { supabase } from '../../src/lib/supabase';
import { errorMessage } from '../../src/utils/errors';

export default function ProfileScreen() {
  const db = useSQLiteContext();
  const { colors, spacing, typography } = useTheme();
  const { userId, members, refreshCouple } = useAuth();

  const currentMember = members.find((m) => m.userId === userId);
  const [name, setName] = useState(currentMember?.displayName ?? '');
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
      router.back();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll>
      <View style={{ paddingTop: spacing.md, paddingBottom: spacing.xxxl }}>
        <View style={styles.headerRow}>
          <NavBarButton
            icon="chevron-back"
            label="Settings"
            onPress={() => router.back()}
          />
        </View>

        <Text
          style={[
            typography.largeTitle,
            { color: colors.text, marginTop: spacing.xs, marginBottom: spacing.sm },
          ]}
        >
          Your Name
        </Text>

        <Text
          style={[
            typography.subheadline,
            { color: colors.textMuted, marginBottom: spacing.xl },
          ]}
        >
          Choose what your partner sees in chat, shared events, and notes.
        </Text>

        <TextField
          label="Display name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Alex"
          maxLength={40}
          error={error}
        />

        <Button
          label="Save"
          onPress={save}
          loading={busy}
          style={{ marginTop: spacing.md }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
});
