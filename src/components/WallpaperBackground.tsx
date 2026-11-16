import React from 'react';
import {
  Image,
  StyleSheet,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../theme/ThemeProvider';
import type { WallpaperId, WallpaperPrefs } from '../theme/wallpaper';

interface PatternElement {
  top: DimensionValue;
  left?: DimensionValue;
  right?: DimensionValue;
  size: number;
  opacity: number;
  rotate?: `${number}deg`;
  icon: keyof typeof Ionicons.glyphMap;
}

/** Hand-placed so the scatter looks deliberate and never overlaps a bubble column. */
const PATTERNS: Record<Exclude<WallpaperId, 'default' | 'custom'>, PatternElement[]> = {
  hearts: [
    { top: '6%', left: '10%', size: 28, opacity: 0.18, rotate: '-15deg', icon: 'heart' },
    { top: '12%', right: '14%', size: 38, opacity: 0.14, rotate: '20deg', icon: 'heart-outline' },
    { top: '22%', left: '24%', size: 18, opacity: 0.22, rotate: '10deg', icon: 'sparkles' },
    { top: '28%', right: '8%', size: 32, opacity: 0.16, rotate: '-25deg', icon: 'heart' },
    { top: '38%', left: '8%', size: 42, opacity: 0.12, rotate: '15deg', icon: 'heart' },
    { top: '48%', right: '22%', size: 20, opacity: 0.2, rotate: '-10deg', icon: 'sparkles' },
    { top: '56%', left: '18%', size: 34, opacity: 0.15, rotate: '25deg', icon: 'heart-outline' },
    { top: '66%', right: '12%', size: 44, opacity: 0.12, rotate: '-18deg', icon: 'heart' },
    { top: '75%', left: '12%', size: 22, opacity: 0.18, rotate: '12deg', icon: 'sparkles' },
    { top: '82%', right: '28%', size: 30, opacity: 0.16, rotate: '-8deg', icon: 'heart' },
    { top: '90%', left: '30%', size: 36, opacity: 0.13, rotate: '18deg', icon: 'heart-outline' },
  ],
  starlight: [
    { top: '5%', left: '15%', size: 16, opacity: 0.35, icon: 'star' },
    { top: '10%', right: '18%', size: 32, opacity: 0.25, icon: 'moon-outline' },
    { top: '18%', left: '28%', size: 22, opacity: 0.3, icon: 'sparkles' },
    { top: '25%', right: '12%', size: 14, opacity: 0.35, icon: 'star' },
    { top: '34%', left: '10%', size: 26, opacity: 0.25, icon: 'sparkles' },
    { top: '44%', right: '25%', size: 18, opacity: 0.3, icon: 'star' },
    { top: '55%', left: '22%', size: 14, opacity: 0.35, icon: 'star-outline' },
    { top: '65%', right: '15%', size: 28, opacity: 0.28, icon: 'sparkles' },
    { top: '74%', left: '14%', size: 18, opacity: 0.32, icon: 'star' },
    { top: '84%', right: '20%', size: 22, opacity: 0.26, icon: 'star' },
    { top: '92%', left: '28%', size: 16, opacity: 0.35, icon: 'sparkles' },
  ],
  sunset: [
    { top: '8%', left: '12%', size: 26, opacity: 0.22, icon: 'sunny-outline' },
    { top: '16%', right: '16%', size: 36, opacity: 0.18, icon: 'heart' },
    { top: '28%', left: '20%', size: 22, opacity: 0.25, icon: 'sparkles' },
    { top: '40%', right: '10%', size: 40, opacity: 0.16, icon: 'heart-outline' },
    { top: '52%', left: '14%', size: 28, opacity: 0.2, icon: 'sunny' },
    { top: '64%', right: '22%', size: 24, opacity: 0.24, icon: 'sparkles' },
    { top: '76%', left: '18%', size: 34, opacity: 0.18, icon: 'heart' },
    { top: '88%', right: '15%', size: 26, opacity: 0.22, icon: 'sunny-outline' },
  ],
  petals: [
    { top: '7%', left: '14%', size: 26, opacity: 0.22, rotate: '30deg', icon: 'flower-outline' },
    { top: '15%', right: '12%', size: 32, opacity: 0.18, rotate: '-45deg', icon: 'flower' },
    { top: '26%', left: '22%', size: 18, opacity: 0.26, rotate: '15deg', icon: 'sparkles' },
    { top: '36%', right: '18%', size: 38, opacity: 0.15, rotate: '60deg', icon: 'flower-outline' },
    { top: '48%', left: '10%', size: 28, opacity: 0.2, rotate: '-20deg', icon: 'flower' },
    { top: '58%', right: '25%', size: 20, opacity: 0.25, rotate: '40deg', icon: 'sparkles' },
    { top: '70%', left: '16%', size: 34, opacity: 0.17, rotate: '-35deg', icon: 'flower-outline' },
    { top: '80%', right: '14%', size: 24, opacity: 0.22, rotate: '25deg', icon: 'flower' },
    { top: '91%', left: '26%', size: 22, opacity: 0.25, rotate: '-15deg', icon: 'sparkles' },
  ],
};

interface WallpaperBackgroundProps {
  prefs: WallpaperPrefs;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function WallpaperBackground({ prefs, children, style }: WallpaperBackgroundProps) {
  const { colors, scheme } = useTheme();
  const id = prefs.id;

  if (id === 'custom' && prefs.customUri) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }, style]}>
        <Image source={{ uri: prefs.customUri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        <View
          style={[
            StyleSheet.absoluteFillObject,
            {
              backgroundColor:
                scheme === 'dark' ? 'rgba(0, 0, 0, 0.72)' : 'rgba(255, 255, 255, 0.72)',
            },
          ]}
        />
        {children}
      </View>
    );
  }

  const pattern = id === 'default' || id === 'custom' ? null : PATTERNS[id];

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: pattern ? colors.surfaceContainerLow : colors.surface },
        style,
      ]}
    >
      {pattern ? (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          {pattern.map((element, index) => (
            <View
              key={index}
              style={[
                styles.element,
                {
                  top: element.top,
                  left: element.left,
                  right: element.right,
                  opacity: element.opacity,
                  transform: element.rotate ? [{ rotate: element.rotate }] : undefined,
                },
              ]}
            >
              <Ionicons name={element.icon} size={element.size} color={colors.primary} />
            </View>
          ))}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  element: { position: 'absolute' },
});
