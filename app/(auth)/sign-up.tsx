import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { Screen } from '../../src/components/Screen';
import { TextField } from '../../src/components/TextField';
import { Button } from '../../src/components/Button';
import { Text } from '../../src/components/Text';
import { TopAppBar } from '../../src/components/TopAppBar';
import { useAuth } from '../../src/auth/AuthProvider';
import { spacing } from '../../src/theme/tokens';
import { errorMessage } from '../../src/utils/errors';

export default function SignUpScreen() {
  const { signUp } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mismatch = confirm.length > 0 && confirm !== password;

  const submit = async () => {
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Use at least 8 characters');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await signUp(email, password);
      router.replace('/(onboarding)/start');
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <TopAppBar title="Create account" onBack={() => router.back()} />
      <Screen scroll contentStyle={styles.content}>
        <Text variant="headlineMedium" strong>
          Create an account
        </Text>
        <Text variant="bodyLarge" color="onSurfaceVariant" style={styles.subtitle}>
          This account is one half of the space. Your partner creates their own.
        </Text>

        <View style={styles.form}>
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            inputMode="email"
            autoComplete="email"
          />

          <View style={styles.spacer} />

          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            hint="There is no password reset email in this build. Store it safely."
          />

          <View style={styles.spacer} />

          <TextField
            label="Confirm password"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            autoCapitalize="none"
            error={mismatch ? 'Passwords do not match' : error}
          />
        </View>

        <Button
          label="Create account"
          onPress={submit}
          size="medium"
          fullWidth
          loading={busy}
          disabled={email.trim().length === 0 || password.length < 8}
        />
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.lg, paddingBottom: spacing.xxxl },
  subtitle: { marginTop: spacing.sm },
  form: { marginTop: spacing.xxl, marginBottom: spacing.xl },
  spacer: { height: spacing.lg },
});
