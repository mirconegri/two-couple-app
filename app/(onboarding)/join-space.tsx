import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { Screen } from '../../src/components/Screen';
import { TextField } from '../../src/components/TextField';
import { Button } from '../../src/components/Button';
import { Text } from '../../src/components/Text';
import { TopAppBar } from '../../src/components/TopAppBar';
import { useAuth } from '../../src/auth/AuthProvider';
import { supabase } from '../../src/lib/supabase';
import { spacing } from '../../src/theme/tokens';
import { errorMessage } from '../../src/utils/errors';

export default function JoinSpaceScreen() {
  const db = useSQLiteContext();
  const { refreshCouple } = useAuth();

  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cleanCode = code.replace(/\s+/g, '');

  const redeem = async () => {
    setBusy(true);
    setError(null);
    try {
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
    <>
      <TopAppBar title="Join the space" onBack={() => router.back()} />
      <Screen scroll contentStyle={styles.content}>
        <Text variant="headlineMedium" strong>
          Join the space
        </Text>
        <Text variant="bodyLarge" color="onSurfaceVariant" style={styles.subtitle}>
          Paste the invitation code your partner sent you.
        </Text>

        <TextField
          label="Invitation code"
          value={code}
          onChangeText={setCode}
          autoCapitalize="none"
          autoCorrect={false}
          multiline
          numberOfLines={3}
          error={error}
          style={styles.code}
        />

        <View style={styles.action}>
          <Button
            label="Join"
            onPress={redeem}
            size="medium"
            fullWidth
            loading={busy}
            disabled={cleanCode.length < 16}
          />
        </View>

        <Text variant="bodySmall" color="onSurfaceVariant" style={styles.footnote}>
          Codes expire after 48 hours and can only be used once. A space holds exactly two people.
        </Text>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.lg, paddingBottom: spacing.xxxl },
  subtitle: { marginTop: spacing.sm, marginBottom: spacing.xxl },
  code: { height: 96, textAlignVertical: 'top', paddingTop: spacing.md },
  action: { marginTop: spacing.xl },
  footnote: { marginTop: spacing.lg },
});
