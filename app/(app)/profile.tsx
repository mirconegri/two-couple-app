import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '../../src/components/Screen';
import { TextField } from '../../src/components/TextField';
import { Button } from '../../src/components/Button';
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
      <View style={{ paddingTop: spacing.lg }}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[typography.heading, { color: colors.text }]}>Your name</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={{ marginTop: spacing.xl }}>
          <Text
            style={[
              typography.body,
              { color: colors.textMuted, marginBottom: spacing.lg },
            ]}
          >
            Choose what your partner calls you in chat, events, and notes.
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
            label="Save name"
            onPress={save}
            loading={busy}
            style={{ marginTop: spacing.lg }}
          />
        </View>
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
});
