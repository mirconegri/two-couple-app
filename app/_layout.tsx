import React, { useCallback } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider } from 'expo-sqlite';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';

void SplashScreen.preventAutoHideAsync();

import { DATABASE_NAME, initDatabase } from '../src/db';
import { AuthProvider } from '../src/auth/AuthProvider';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import { SyncProvider } from '../src/sync/SyncProvider';
import { configureNotificationChannels } from '../src/notifications/reminders';

// Ensure Android notification channels exist before any notification is scheduled.
void configureNotificationChannels();

// Foreground behaviour: a message notification should not interrupt an open
// conversation, so banners are suppressed while the app is active.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  const onInit = useCallback(async (db: Parameters<typeof initDatabase>[0]) => {
    await initDatabase(db);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <SQLiteProvider databaseName={DATABASE_NAME} onInit={onInit} useSuspense={false}>
            <AuthProvider>
              <SyncProvider>
                <StatusBar style="auto" />
                <Stack
                  screenOptions={{
                    headerShown: false,
                    animation: 'fade',
                    animationDuration: 200,
                  }}
                >
                  <Stack.Screen name="index" />
                  <Stack.Screen name="(auth)" />
                  <Stack.Screen name="(onboarding)" />
                  <Stack.Screen name="(app)" />
                </Stack>
              </SyncProvider>
            </AuthProvider>
          </SQLiteProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
