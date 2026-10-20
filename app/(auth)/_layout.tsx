import React from 'react';
import { Redirect, Stack } from 'expo-router';

import { useAuth } from '../../src/auth/AuthProvider';

export default function AuthLayout() {
  const { ready, session } = useAuth();

  if (ready && session) return <Redirect href="/(app)/(tabs)" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
