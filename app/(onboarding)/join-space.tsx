import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { Screen } from '../../src/components/Screen';
import { TextField } from '../../src/components/TextField';
import { Button } from '../../src/components/Button';
import { useAuth } from '../../src/auth/AuthProvider';
import { useTheme } from '../../src/theme/ThemeProvider';
import { supabase } from '../../src/lib/supabase';
import { errorMessage } from '../../src/utils/errors';

export default function JoinSpaceScreen() {
  const db = useSQLiteContext();
  const { refreshCouple } = useAuth();
  const { colors, spacing, typography } = useTheme();

  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redeem = async () => {
    setBusy(true);
    setError(null);
    try {
      const cleanCode = code.replace(/\s+/g, '');
      const { error: rpcError } = await supabase.rpc('redeem_invitation', {
        p_code: cleanCode,
      });
      if (rpcError) throw new Error(rpcError.message);

      await refreshCouple(db);
      router.replace('/(app)/(tabs)');
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll>
      <View style={{ paddingTop: spacing.xxxl }}>
        <Text style={[typography.title, { color: colors.text }]}>Join the space</Text>
        <Text
          style={[
            typography.body,
            { color: colors.textMuted, marginTop: spacing.sm, marginBottom: spacing.xxl },
          ]}
        >
          Paste the invitation code your partner sent you.
        </Text>

        <TextField
          label="Invitation code"
          value={code}
          onChangeText={setCode}
          placeholder="Paste the code"
          autoCapitalize="none"
          autoCorrect={false}
          multiline
          numberOfLines={3}
          error={error}
          style={{ minHeight: 80, textAlignVertical: 'top' }}
        />

        <Button
          label="Join"
          onPress={redeem}
          loading={busy}
          disabled={code.replace(/\s+/g, '').length < 16}
        />

        <Text
          style={[
            typography.caption,
            { color: colors.textFaint, marginTop: spacing.lg },
          ]}
        >
          Codes expire after 48 hours and can only be used once. A space holds exactly
          two people.
        </Text>
      </View>
    </Screen>
  );
}
