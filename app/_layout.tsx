import React, { useCallback, useEffect, useMemo } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider } from 'expo-sqlite';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import {
  ThemeProvider as NavigationThemeProvider,
  DarkTheme,
  DefaultTheme,
} from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';

import { DATABASE_NAME, initDatabase } from '../src/db';
import { AuthProvider } from '../src/auth/AuthProvider';
import { ThemeProvider, useTheme } from '../src/theme/ThemeProvider';
import { WallpaperProvider } from '../src/theme/WallpaperProvider';
import { SyncProvider } from '../src/sync/SyncProvider';
import { configureNotificationChannels } from '../src/notifications/reminders';

// Keep the splash screen visible while theme preferences and resources are loaded
SplashScreen.preventAutoHideAsync().catch(() => {});

// Ensure Android notification channels exist before any notification is scheduled.
void configureNotificationChannels();

// Show alert banner and play sound when a notification arrives
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function RootNavigator() {
  const { colors, scheme } = useTheme();

  // Keep Android root window background in sync with theme to eliminate transition flashes
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.background).catch(() => {});
  }, [colors.background]);

  const navTheme = useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: colors.background,
        card: colors.surface,
        border: colors.border,
        text: colors.text,
        primary: colors.accent,
      },
    };
  }, [colors, scheme]);

  return (
    <NavigationThemeProvider value={navTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} backgroundColor={colors.background} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          animationDuration: 200,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(app)" />
      </Stack>
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  const onInit = useCallback(async (db: Parameters<typeof initDatabase>[0]) => {
    await initDatabase(db);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <KeyboardProvider>
          <ThemeProvider>
            <WallpaperProvider>
              <SQLiteProvider databaseName={DATABASE_NAME} onInit={onInit} useSuspense={false}>
                <AuthProvider>
                  <SyncProvider>
                    <RootNavigator />
                  </SyncProvider>
                </AuthProvider>
              </SQLiteProvider>
            </WallpaperProvider>
          </ThemeProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
