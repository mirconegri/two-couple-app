import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '../../src/components/Screen';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { useAuth } from '../../src/auth/AuthProvider';
import { useTheme } from '../../src/theme/ThemeProvider';

export default function OnboardingStart() {
  const { coupleId } = useAuth();
  const { colors, spacing, typography, radii } = useTheme();

  if (coupleId) {
    return <Redirect href="/(app)/(tabs)" />;
  }

  return (
    <Screen scroll>
      <View style={{ paddingTop: spacing.xxl, paddingBottom: spacing.xxxl }}>
        <Text style={[typography.largeTitle, { color: colors.text }]}>
          Let&apos;s set up your space
        </Text>
        <Text
          style={[
            typography.body,
            { color: colors.textMuted, marginTop: spacing.sm, marginBottom: spacing.xxl },
          ]}
        >
          One of you creates the space and shares an invitation. The other joins with it.
          After that, nobody else can get in.
        </Text>

        <Card style={{ marginBottom: spacing.lg }}>
          <View style={styles.row}>
            <View
              style={[
                styles.iconWrap,
                { backgroundColor: colors.accentSoft, borderRadius: radii.md },
              ]}
            >
              <Ionicons name="add-circle-outline" size={22} color={colors.accent} />
            </View>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={[typography.headline, { color: colors.text }]}>
                Create the space
              </Text>
              <Text
                style={[
                  typography.subheadline,
                  { color: colors.textMuted, marginTop: 2 },
                ]}
              >
                You go first and generate an invitation code.
              </Text>
            </View>
          </View>

          <Button
            label="Create our space"
            onPress={() => router.push('/(onboarding)/create-space')}
            style={{ marginTop: spacing.lg }}
          />
        </Card>

        <Card>
          <View style={styles.row}>
            <View
              style={[
                styles.iconWrap,
                { backgroundColor: colors.surfaceMuted, borderRadius: radii.md },
              ]}
            >
              <Ionicons name="key-outline" size={22} color={colors.textMuted} />
            </View>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={[typography.headline, { color: colors.text }]}>
                Join with a code
              </Text>
              <Text
                style={[
                  typography.subheadline,
                  { color: colors.textMuted, marginTop: 2 },
                ]}
              >
                Your partner already created the space and sent you a code.
              </Text>
            </View>
          </View>

          <Button
            label="I have an invitation"
            variant="secondary"
            onPress={() => router.push('/(onboarding)/join-space')}
            style={{ marginTop: spacing.lg }}
          />
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
});
