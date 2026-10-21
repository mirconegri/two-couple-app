import React from 'react';
import { Redirect, Stack } from 'expo-router';

import { useAuth } from '../../src/auth/AuthProvider';

export default function OnboardingLayout() {
  const { ready, session } = useAuth();

  if (!ready) return null;
  if (!session) return <Redirect href="/(auth)/sign-in" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
