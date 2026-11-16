import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '../../src/components/Screen';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { Text } from '../../src/components/Text';
import { useAuth } from '../../src/auth/AuthProvider';
import { useTheme } from '../../src/theme/ThemeProvider';
import { iconSize, shape, spacing } from '../../src/theme/tokens';

export default function OnboardingStart() {
  const { coupleId } = useAuth();
  const { colors } = useTheme();

  if (coupleId) {
    return <Redirect href="/(app)/(tabs)" />;
  }

  return (
    <Screen scroll edges={['top', 'left', 'right', 'bottom']} contentStyle={styles.content}>
      <Text variant="displaySmall" strong>
        Set up your space
      </Text>
      <Text variant="bodyLarge" color="onSurfaceVariant" style={styles.subtitle}>
        One of you creates the space and shares an invitation. The other joins with it. After
        that, nobody else can get in.
      </Text>

      <Card variant="elevated" style={styles.card}>
        <View style={styles.row}>
          <View style={[styles.mark, { backgroundColor: colors.primaryContainer }]}>
            <Ionicons name="add-circle" size={iconSize.md} color={colors.onPrimaryContainer} />
          </View>
          <View style={styles.labels}>
            <Text variant="titleMedium" strong>
              Create the space
            </Text>
            <Text variant="bodyMedium" color="onSurfaceVariant">
              You go first and generate an invitation code.
            </Text>
          </View>
        </View>

        <Button
          label="Create our space"
          onPress={() => router.push('/(onboarding)/create-space')}
          fullWidth
          style={styles.cardAction}
        />
      </Card>

      <Card variant="filled">
        <View style={styles.row}>
          <View style={[styles.mark, { backgroundColor: colors.surfaceContainerHighest }]}>
            <Ionicons name="key" size={iconSize.md} color={colors.onSurfaceVariant} />
          </View>
          <View style={styles.labels}>
            <Text variant="titleMedium" strong>
              Join with a code
            </Text>
            <Text variant="bodyMedium" color="onSurfaceVariant">
              Your partner already created the space and sent you a code.
            </Text>
          </View>
        </View>

        <Button
          label="I have an invitation"
          variant="tonal"
          onPress={() => router.push('/(onboarding)/join-space')}
          fullWidth
          style={styles.cardAction}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.xxxl, paddingBottom: spacing.xxxl },
  subtitle: { marginTop: spacing.sm, marginBottom: spacing.xxl },
  card: { marginBottom: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  labels: { flex: 1, gap: 2 },
  mark: {
    width: 48,
    height: 48,
    borderRadius: shape.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardAction: { marginTop: spacing.lg },
});
