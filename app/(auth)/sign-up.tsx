import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';

import { Screen } from '../../src/components/Screen';
import { TextField } from '../../src/components/TextField';
import { Button } from '../../src/components/Button';
import { useAuth } from '../../src/auth/AuthProvider';
import { useTheme } from '../../src/theme/ThemeProvider';
import { errorMessage } from '../../src/utils/errors';

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const { colors, spacing, typography } = useTheme();

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
    <Screen scroll>
      <View style={{ paddingTop: spacing.xxxl }}>
        <Text style={[typography.title, { color: colors.text }]}>Create an account</Text>
        <Text
          style={[
            typography.body,
            { color: colors.textMuted, marginTop: spacing.sm, marginBottom: spacing.xxl },
          ]}
        >
          This account is one half of the space. Your partner creates their own.
        </Text>

        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          autoCapitalize="none"
          keyboardType="email-address"
          inputMode="email"
          autoComplete="email"
        />

        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="At least 8 characters"
          secureTextEntry
          autoCapitalize="none"
          hint="There is no password reset email in this build. Store it safely."
        />

        <TextField
          label="Confirm password"
          value={confirm}
          onChangeText={setConfirm}
          placeholder="Repeat the password"
          secureTextEntry
          autoCapitalize="none"
          error={mismatch ? 'Passwords do not match' : error}
        />

        <Button
          label="Create account"
          onPress={submit}
          loading={busy}
          disabled={email.trim().length === 0 || password.length < 8}
        />
      </View>
    </Screen>
  );
}
