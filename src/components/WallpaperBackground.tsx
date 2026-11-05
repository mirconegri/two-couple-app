import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import type { WallpaperPrefs } from '../theme/wallpaper';

interface WallpaperBackgroundProps {
  prefs: WallpaperPrefs;
  children: React.ReactNode;
  style?: object;
}

interface PatternElement {
  top: string;
  left?: string;
  right?: string;
  size: number;
  opacity: number;
  rotate?: string;
  icon: keyof typeof Ionicons.glyphMap;
}

// Deterministic romantic floating elements layout
const HEARTS_ELEMENTS: PatternElement[] = [
  { top: '6%', left: '10%', size: 28, opacity: 0.18, rotate: '-15deg', icon: 'heart' as const },
  { top: '12%', right: '14%', size: 38, opacity: 0.14, rotate: '20deg', icon: 'heart-outline' as const },
  { top: '22%', left: '24%', size: 18, opacity: 0.22, rotate: '10deg', icon: 'sparkles' as const },
  { top: '28%', right: '8%', size: 32, opacity: 0.16, rotate: '-25deg', icon: 'heart' as const },
  { top: '38%', left: '8%', size: 42, opacity: 0.12, rotate: '15deg', icon: 'heart' as const },
  { top: '48%', right: '22%', size: 20, opacity: 0.2, rotate: '-10deg', icon: 'sparkles' as const },
  { top: '56%', left: '18%', size: 34, opacity: 0.15, rotate: '25deg', icon: 'heart-outline' as const },
  { top: '66%', right: '12%', size: 44, opacity: 0.12, rotate: '-18deg', icon: 'heart' as const },
  { top: '75%', left: '12%', size: 22, opacity: 0.18, rotate: '12deg', icon: 'sparkles' as const },
  { top: '82%', right: '28%', size: 30, opacity: 0.16, rotate: '-8deg', icon: 'heart' as const },
  { top: '90%', left: '30%', size: 36, opacity: 0.13, rotate: '18deg', icon: 'heart-outline' as const },
];

const STARLIGHT_ELEMENTS: PatternElement[] = [
  { top: '5%', left: '15%', size: 16, opacity: 0.35, icon: 'star' as const },
  { top: '10%', right: '18%', size: 32, opacity: 0.25, icon: 'moon-outline' as const },
  { top: '18%', left: '28%', size: 22, opacity: 0.3, icon: 'sparkles' as const },
  { top: '25%', right: '12%', size: 14, opacity: 0.35, icon: 'star' as const },
  { top: '34%', left: '10%', size: 26, opacity: 0.25, icon: 'sparkles' as const },
  { top: '44%', right: '25%', size: 18, opacity: 0.3, icon: 'star' as const },
  { top: '55%', left: '22%', size: 14, opacity: 0.35, icon: 'star-outline' as const },
  { top: '65%', right: '15%', size: 28, opacity: 0.28, icon: 'sparkles' as const },
  { top: '74%', left: '14%', size: 18, opacity: 0.32, icon: 'star' as const },
  { top: '84%', right: '20%', size: 22, opacity: 0.26, icon: 'star' as const },
  { top: '92%', left: '28%', size: 16, opacity: 0.35, icon: 'sparkles' as const },
];

const SUNSET_ELEMENTS: PatternElement[] = [
  { top: '8%', left: '12%', size: 26, opacity: 0.22, icon: 'sunny-outline' as const },
  { top: '16%', right: '16%', size: 36, opacity: 0.18, icon: 'heart' as const },
  { top: '28%', left: '20%', size: 22, opacity: 0.25, icon: 'sparkles' as const },
  { top: '40%', right: '10%', size: 40, opacity: 0.16, icon: 'heart-outline' as const },
  { top: '52%', left: '14%', size: 28, opacity: 0.2, icon: 'sunny' as const },
  { top: '64%', right: '22%', size: 24, opacity: 0.24, icon: 'sparkles' as const },
  { top: '76%', left: '18%', size: 34, opacity: 0.18, icon: 'heart' as const },
  { top: '88%', right: '15%', size: 26, opacity: 0.22, icon: 'sunny-outline' as const },
];

const PETALS_ELEMENTS: PatternElement[] = [
  { top: '7%', left: '14%', size: 26, opacity: 0.22, rotate: '30deg', icon: 'flower-outline' as const },
  { top: '15%', right: '12%', size: 32, opacity: 0.18, rotate: '-45deg', icon: 'flower' as const },
  { top: '26%', left: '22%', size: 18, opacity: 0.26, rotate: '15deg', icon: 'sparkles' as const },
  { top: '36%', right: '18%', size: 38, opacity: 0.15, rotate: '60deg', icon: 'flower-outline' as const },
  { top: '48%', left: '10%', size: 28, opacity: 0.2, rotate: '-20deg', icon: 'flower' as const },
  { top: '58%', right: '25%', size: 20, opacity: 0.25, rotate: '40deg', icon: 'sparkles' as const },
  { top: '70%', left: '16%', size: 34, opacity: 0.17, rotate: '-35deg', icon: 'flower-outline' as const },
  { top: '80%', right: '14%', size: 24, opacity: 0.22, rotate: '25deg', icon: 'flower' as const },
  { top: '91%', left: '26%', size: 22, opacity: 0.25, rotate: '-15deg', icon: 'sparkles' as const },
];

export function WallpaperBackground({ prefs, children, style }: WallpaperBackgroundProps) {
  const { colors, scheme } = useTheme();
  const isDark = scheme === 'dark';

  if (prefs.id === 'default') {
    return <View style={[styles.container, { backgroundColor: colors.background }, style]}>{children}</View>;
  }

  if (prefs.id === 'custom' && prefs.customUri) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }, style]}>
        <Image
          source={{ uri: prefs.customUri }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />
        <View
          style={[
            StyleSheet.absoluteFillObject,
            {
              backgroundColor: isDark ? 'rgba(10, 10, 12, 0.72)' : 'rgba(255, 255, 255, 0.65)',
            },
          ]}
        />
        {children}
      </View>
    );
  }

  let patternColor = '#FF2D55';
  let elements = HEARTS_ELEMENTS;
  let bgGradientTint = isDark ? '#1C0E14' : '#FFF5F8';

  if (prefs.id === 'starlight') {
    patternColor = isDark ? '#A5B4FC' : '#6366F1';
    elements = STARLIGHT_ELEMENTS;
    bgGradientTint = isDark ? '#0B0F1C' : '#F4F6FF';
  } else if (prefs.id === 'sunset') {
    patternColor = isDark ? '#FDBA74' : '#F97316';
    elements = SUNSET_ELEMENTS;
    bgGradientTint = isDark ? '#1C120C' : '#FFF7ED';
  } else if (prefs.id === 'petals') {
    patternColor = isDark ? '#FDA4AF' : '#F43F5E';
    elements = PETALS_ELEMENTS;
    bgGradientTint = isDark ? '#1A0C11' : '#FFF1F2';
  }

  return (
    <View style={[styles.container, { backgroundColor: bgGradientTint }, style]}>
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        {elements.map((el, index) => (
          <View
            key={index}
            style={[
              styles.elementWrapper,
              {
                top: el.top as any,
                left: (el as any).left,
                right: (el as any).right,
                opacity: el.opacity,
                transform: (el as any).rotate ? [{ rotate: (el as any).rotate }] : undefined,
              },
            ]}
          >
            <Ionicons name={el.icon} size={el.size} color={patternColor} />
          </View>
        ))}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  elementWrapper: {
    position: 'absolute',
  },
});
