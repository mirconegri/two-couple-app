import React from 'react';
import { Redirect, Stack } from 'expo-router';

import { useAuth } from '../../src/auth/AuthProvider';

export default function OnboardingLayout() {
  const { ready, session, coupleId } = useAuth();

  if (!ready) return null;
  if (!session) return <Redirect href="/(auth)/sign-in" />;
  if (coupleId) return <Redirect href="/(app)/(tabs)" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
