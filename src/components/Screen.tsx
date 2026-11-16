import React from 'react';
import {
  StyleSheet,
  View,
  type RefreshControlProps,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { useTheme } from '../theme/ThemeProvider';
import { useWallpaper } from '../theme/WallpaperProvider';
import { WallpaperBackground } from './WallpaperBackground';
import type { ColorScheme } from '../theme/color';

export interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  contentStyle?: StyleProp<ViewStyle>;
  /** Safe-area edges the screen body respects. The top app bar owns the top inset. */
  edges?: readonly Edge[];
  scrollRef?: React.Ref<Animated.ScrollView>;
  onScroll?: ScrollViewProps['onScroll'];
  background?: keyof ColorScheme;
}

export function Screen({
  children,
  scroll = false,
  padded = true,
  refreshControl,
  contentStyle,
  edges = ['left', 'right', 'bottom'],
  scrollRef,
  onScroll,
  background = 'surface',
}: ScreenProps) {
  const { colors, spacing } = useTheme();
  const { prefs } = useWallpaper();
  const wallpaperActive = prefs.scope === 'all' && (prefs.id !== 'default' || Boolean(prefs.customUri));

  const body = (
    <View style={[styles.fill, padded && { paddingHorizontal: spacing.lg }, contentStyle]}>
      {children}
    </View>
  );

  const content = (
    <SafeAreaView
      style={[styles.fill, { backgroundColor: wallpaperActive ? 'transparent' : colors[background] }]}
      edges={edges}
    >
      {scroll ? (
        <Animated.ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={refreshControl}
          onScroll={onScroll}
          scrollEventThrottle={16}
        >
          {body}
        </Animated.ScrollView>
      ) : (
        body
      )}
    </SafeAreaView>
  );

  if (wallpaperActive) {
    return (
      <WallpaperBackground prefs={prefs} style={styles.fill}>
        {content}
      </WallpaperBackground>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 32 },
});
