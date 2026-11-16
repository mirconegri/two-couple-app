import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../../src/theme/ThemeProvider';
import { useSync } from '../../../src/sync/SyncProvider';
import { PressableScale } from '../../../src/components/PressableScale';
import { shape } from '../../../src/theme/tokens';

const BAR_HEIGHT = 64;

export default function TabsLayout() {
  const { colors, typography, reducedMotion } = useTheme();
  const { unreadCount } = useSync();
  const insets = useSafeAreaInsets();

  const tabIcon =
    (active: keyof typeof Ionicons.glyphMap, inactive: keyof typeof Ionicons.glyphMap) =>
    ({ color, focused }: { color: string; focused: boolean }) => (
      <View
        style={[
          styles.indicator,
          focused && { backgroundColor: colors.secondaryContainer },
        ]}
      >
        <Ionicons
          name={focused ? active : inactive}
          size={24}
          color={focused ? colors.onSecondaryContainer : color}
        />
      </View>
    );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: reducedMotion ? 'none' : 'shift',
        sceneStyle: { backgroundColor: colors.surface },
        tabBarButton: ({ ref, ...props }) => (
          <PressableScale {...props} scaleTo={0.94} haptics="selection" />
        ),
        tabBarActiveTintColor: colors.onSurface,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
        tabBarStyle: {
          height: BAR_HEIGHT + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom + 8,
          backgroundColor: colors.surfaceContainer,
          borderTopWidth: 0,
          elevation: 0,
        },
        tabBarLabelStyle: { ...typography.labelMedium, marginTop: 4 },
        tabBarItemStyle: { paddingVertical: 0 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: tabIcon('home', 'home-outline') }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: tabIcon('chatbubble-ellipses', 'chatbubble-ellipses-outline'),
          tabBarBadge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.error,
            color: colors.onError,
            ...typography.labelSmall,
            minWidth: 16,
            height: 16,
            lineHeight: 16,
            borderRadius: shape.full,
          },
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{ title: 'Calendar', tabBarIcon: tabIcon('calendar', 'calendar-outline') }}
      />
      <Tabs.Screen
        name="notes"
        options={{ title: 'Notes', tabBarIcon: tabIcon('document-text', 'document-text-outline') }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  indicator: {
    width: 64,
    height: 32,
    borderRadius: shape.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
