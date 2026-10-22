import React, { useEffect } from 'react';
import { Redirect, Stack } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { useAuth } from '../../src/auth/AuthProvider';
import { registerForPushNotifications } from '../../src/notifications/push';
import { LoadingScreen } from '../../src/components/LoadingScreen';

export default function AppLayout() {
  const { ready, session, coupleId, userId } = useAuth();
  const db = useSQLiteContext();

  useEffect(() => {
    if (!coupleId || !userId) return;
    // Best effort: a failure here must never block the app.
    void registerForPushNotifications(coupleId, userId, db);
  }, [coupleId, userId, db]);

  // Deep link from a notification tap.
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as
          | { type?: string; eventId?: string }
          | undefined;

        if (data?.type === 'chat') router.push('/(app)/(tabs)/chat');
        if (data?.type === 'event' && data.eventId) {
          router.push(`/(app)/event/${data.eventId}`);
        }
      },
    );

    return () => subscription.remove();
  }, []);

  if (!ready) return <LoadingScreen />;
  if (!session) return <Redirect href="/(auth)/sign-in" />;
  if (!coupleId) return <Redirect href="/(onboarding)/start" />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="invite" options={{ headerShown: false }} />
      <Stack.Screen name="profile" options={{ headerShown: false }} />
      <Stack.Screen name="note/new" options={{ headerShown: false }} />
      <Stack.Screen name="note/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="event/[id]/edit" options={{ headerShown: false }} />
    </Stack>
  );
}
