import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, useColorScheme } from 'react-native';
import {
  createMaterial3Theme,
  getMaterial3Theme,
  isDynamicThemeSupported,
} from '@pchmn/expo-material3-theme';
import type { TextStyle } from 'react-native';

import { useSettings } from '../settings/SettingsProvider';
import { buildColorScheme, type ColorScheme, type Scheme } from './color';
import { elevation, shape, spacing, stateLayer, buildTypography, type TypeRoleName } from './tokens';

export interface Theme {
  colors: ColorScheme;
  scheme: Scheme;
  typography: Record<TypeRoleName, TextStyle>;
  spacing: typeof spacing;
  shape: typeof shape;
  elevation: typeof elevation;
  stateLayer: typeof stateLayer;
  reducedMotion: boolean;
  /** True when the palette really comes from the wallpaper, not from the seed. */
  dynamicColorActive: boolean;
}

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  const systemScheme = useColorScheme();
  const [systemReducedMotion, setSystemReducedMotion] = useState(false);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setSystemReducedMotion);
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setSystemReducedMotion,
    );
    return () => subscription.remove();
  }, []);

  const useDynamic = settings.dynamicColor && isDynamicThemeSupported;

  // Building a palette runs the HCT quantiser, so it only happens when an input really changes.
  const palette = useMemo(
    () => (useDynamic ? getMaterial3Theme() : createMaterial3Theme(settings.seedColor)),
    [useDynamic, settings.seedColor],
  );

  const scheme: Scheme =
    settings.themeMode === 'system'
      ? systemScheme === 'dark'
        ? 'dark'
        : 'light'
      : settings.themeMode;

  const colors = useMemo(
    () => buildColorScheme(palette[scheme], scheme, settings.amoledBlack),
    [palette, scheme, settings.amoledBlack],
  );

  const typography = useMemo(() => buildTypography(settings.textScale), [settings.textScale]);

  const value = useMemo<Theme>(
    () => ({
      colors,
      scheme,
      typography,
      spacing,
      shape,
      elevation,
      stateLayer,
      reducedMotion: systemReducedMotion || !settings.motion,
      dynamicColorActive: useDynamic,
    }),
    [colors, scheme, typography, systemReducedMotion, settings.motion, useDynamic],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme must be used inside ThemeProvider');
  return theme;
}
