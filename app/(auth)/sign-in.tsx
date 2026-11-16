import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '../../src/components/Screen';
import { TextField } from '../../src/components/TextField';
import { Button } from '../../src/components/Button';
import { Text } from '../../src/components/Text';
import { useAuth } from '../../src/auth/AuthProvider';
import { useTheme } from '../../src/theme/ThemeProvider';
import { shape, spacing } from '../../src/theme/tokens';
import { errorMessage } from '../../src/utils/errors';

export default function SignInScreen() {
  const { signIn } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();

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
    <Screen scroll edges={['top', 'left', 'right', 'bottom']} contentStyle={styles.content}>
      <View style={[styles.mark, { backgroundColor: colors.primaryContainer }]}>
        <Ionicons name="heart-half" size={32} color={colors.onPrimaryContainer} />
      </View>

      <Text variant="displaySmall" strong style={styles.title}>
        Welcome back
      </Text>
      <Text variant="bodyLarge" color="onSurfaceVariant" style={styles.subtitle}>
        A private space for the two of you. Messages, plans, nothing else.
      </Text>

      <View style={styles.form}>
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          inputMode="email"
          textContentType="emailAddress"
          returnKeyType="next"
        />

        <View style={styles.spacer} />

        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="password"
          textContentType="password"
          returnKeyType="done"
          onSubmitEditing={submit}
          error={error}
        />
      </View>

      <Button
        label="Sign in"
        onPress={submit}
        size="medium"
        fullWidth
        loading={busy}
        disabled={email.trim().length === 0 || password.length === 0}
      />

      <View style={styles.footer}>
        <Text variant="bodyMedium" color="onSurfaceVariant">
          No account yet?
        </Text>
        <Button
          label="Create one"
          variant="text"
          onPress={() => router.push('/(auth)/sign-up')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.xxxl, paddingBottom: spacing.xxxl, justifyContent: 'center' },
  mark: {
    width: 72,
    height: 72,
    borderRadius: shape.lgIncreased,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { marginTop: spacing.xl },
  subtitle: { marginTop: spacing.sm },
  form: { marginTop: spacing.xxxl, marginBottom: spacing.xl },
  spacer: { height: spacing.lg },
  footer: { marginTop: spacing.xl, alignItems: 'center', gap: spacing.xs },
});
