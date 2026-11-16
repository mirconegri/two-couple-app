import React, { useEffect } from 'react';
import { Redirect, Stack, router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useSQLiteContext } from 'expo-sqlite';

import { useAuth } from '../../src/auth/AuthProvider';
import { useTheme } from '../../src/theme/ThemeProvider';
import { registerForPushNotifications } from '../../src/notifications/push';
import { LoadingScreen } from '../../src/components/LoadingScreen';
import { duration } from '../../src/theme/motion';

export default function AppLayout() {
  const { ready, session, coupleId, userId } = useAuth();
  const { colors, reducedMotion } = useTheme();
  const db = useSQLiteContext();

  useEffect(() => {
    if (!coupleId || !userId) return;
    // Best effort: a failure here must never block the app.
    void registerForPushNotifications(coupleId, userId, db);
  }, [coupleId, userId, db]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as
        | { type?: string; eventId?: string }
        | undefined;

      if (data?.type === 'chat') router.push('/(app)/(tabs)/chat');
      if (data?.type === 'event' && data.eventId) router.push(`/(app)/event/${data.eventId}`);
    });

    return () => subscription.remove();
  }, []);

  if (!ready) return <LoadingScreen />;
  if (!session) return <Redirect href="/(auth)/sign-in" />;
  if (!coupleId) return <Redirect href="/(onboarding)/start" />;

  const push = {
    animation: reducedMotion ? ('fade' as const) : ('slide_from_right' as const),
    animationDuration: reducedMotion ? duration.short4 : duration.medium2,
  };

  const sheet = {
    presentation: 'modal' as const,
    animation: reducedMotion ? ('fade' as const) : ('slide_from_bottom' as const),
    animationDuration: reducedMotion ? duration.short4 : duration.medium2,
  };

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.surface },
        ...push,
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="event/new" options={sheet} />
      <Stack.Screen name="event/[id]" />
      <Stack.Screen name="event/[id]/edit" options={sheet} />
      <Stack.Screen name="note/new" options={sheet} />
      <Stack.Screen name="note/[id]" options={sheet} />
      <Stack.Screen name="invite" options={sheet} />
      <Stack.Screen name="profile" options={sheet} />
      <Stack.Screen name="settings" options={sheet} />
    </Stack>
  );
}
