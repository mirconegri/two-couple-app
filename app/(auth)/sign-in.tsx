import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '../../src/components/Screen';
import { TextField } from '../../src/components/TextField';
import { Button } from '../../src/components/Button';
import { useAuth } from '../../src/auth/AuthProvider';
import { useTheme } from '../../src/theme/ThemeProvider';
import { errorMessage } from '../../src/utils/errors';

export default function SignInScreen() {
  const { signIn } = useAuth();
  const { colors, spacing, typography, radii } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll>
      <View style={{ paddingTop: spacing.huge, paddingBottom: spacing.xxxl }}>
        <View
          style={[
            styles.mark,
            { backgroundColor: colors.accentSoft, borderRadius: radii.xl },
          ]}
        >
          <Ionicons name="heart-half-outline" size={30} color={colors.accent} />
        </View>

        <Text style={[typography.largeTitle, { color: colors.text, marginTop: spacing.xl }]}>
          Two
        </Text>
        <Text
          style={[
            typography.subheadline,
            { color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.xxxl },
          ]}
        >
          A private space for the two of you. Messages, plans, nothing else.
        </Text>

        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          inputMode="email"
          textContentType="emailAddress"
        />

        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Your password"
          secureTextEntry
          autoCapitalize="none"
          autoComplete="password"
          textContentType="password"
          error={error}
        />

        <Button
          label="Sign in"
          onPress={submit}
          loading={busy}
          disabled={email.trim().length === 0 || password.length === 0}
        />

        <View style={{ marginTop: spacing.xl, alignItems: 'center' }}>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            No account yet?
          </Text>
          <Link href="/(auth)/sign-up" asChild>
            <Pressable hitSlop={8} style={{ paddingVertical: spacing.sm }}>
              <Text style={[typography.bodyStrong, { color: colors.accent }]}>
                Create one
              </Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  mark: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center' },
});
