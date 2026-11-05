import React from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type RefreshControlProps,
  type ViewStyle,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../theme/ThemeProvider';
import { useWallpaper } from '../theme/WallpaperProvider';
import { WallpaperBackground } from './WallpaperBackground';

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  contentStyle?: ViewStyle;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  scrollRef?: React.RefObject<any>;
}

export function Screen({
  children,
  scroll = false,
  padded = true,
  refreshControl,
  contentStyle,
  edges = ['top'],
  scrollRef,
}: ScreenProps) {
  const { colors, spacing } = useTheme();
  const { prefs: wallpaperPrefs } = useWallpaper();
  const applyWallpaper = wallpaperPrefs.scope === 'all' && (wallpaperPrefs.id !== 'default' || Boolean(wallpaperPrefs.customUri));

  const body = (
    <View
      style={[
        styles.fill,
        padded && { paddingHorizontal: spacing.lg },
        contentStyle,
      ]}
    >
      {children}
    </View>
  );

  const content = (
    <SafeAreaView
      style={[styles.fill, { backgroundColor: applyWallpaper ? 'transparent' : colors.background }]}
      edges={edges}
    >
      {scroll ? (
        <Animated.ScrollView
          ref={scrollRef}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: spacing.xxl }}
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}
          scrollEventThrottle={16}
        >
          {body}
        </Animated.ScrollView>
      ) : (
        body
      )}
    </SafeAreaView>
  );

  if (applyWallpaper) {
    return <WallpaperBackground prefs={wallpaperPrefs} style={styles.fill}>{content}</WallpaperBackground>;
  }

  return content;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
