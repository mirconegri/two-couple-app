import React from 'react';
import { Redirect } from 'expo-router';

import { useAuth } from '../src/auth/AuthProvider';
import { LoadingScreen } from '../src/components/LoadingScreen';

export default function Index() {
  const { ready, session, coupleId } = useAuth();

  if (!ready) return <LoadingScreen label="Opening your space" />;
  if (!session) return <Redirect href="/(auth)/sign-in" />;
  if (!coupleId) return <Redirect href="/(onboarding)/start" />;
  return <Redirect href="/(app)/(tabs)" />;
}
