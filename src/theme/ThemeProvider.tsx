import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';

import {
  darkColors,
  lightColors,
  palette,
  radii,
  spacing,
  typography,
  type ThemeColors,
} from './tokens';
import {
  accents,
  DEFAULT_PREFS,
  PREFS_STORAGE_KEY,
  type AccentKey,
  type ThemeMode,
  type ThemePrefs,
} from './preferences';

export interface Theme {
  colors: ThemeColors;
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
  scheme: 'light' | 'dark';
  prefs: ThemePrefs;
  updatePrefs: (p: Partial<ThemePrefs>) => void;
}

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<ThemePrefs>(DEFAULT_PREFS);
  const systemScheme = useColorScheme();

  useEffect(() => {
    let isMounted = true;

    // Safety timeout: ensure splash screen hides even if storage is slow or hangs
    const safetyTimer = setTimeout(() => {
      void SplashScreen.hideAsync().catch(() => {});
    }, 1500);

    AsyncStorage.getItem(PREFS_STORAGE_KEY)
      .then((raw) => {
        if (!isMounted) return;
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as Partial<ThemePrefs>;
            const mode: ThemeMode =
              parsed.mode === 'auto' || parsed.mode === 'light' || parsed.mode === 'dark'
                ? parsed.mode
                : DEFAULT_PREFS.mode;
            const accent: AccentKey =
              typeof parsed.accent === 'string' && parsed.accent in accents
                ? parsed.accent
                : DEFAULT_PREFS.accent;
            setPrefs({ mode, accent });
          } catch (err) {
            console.warn('[ThemeProvider] Failed to parse stored theme preferences:', err);
          }
        }
      })
      .catch((err) => {
        console.warn('[ThemeProvider] Failed to load theme preferences from storage:', err);
      })
      .finally(() => {
        clearTimeout(safetyTimer);
        if (isMounted) {
          void SplashScreen.hideAsync().catch(() => {});
        }
      });

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
    };
  }, []);

  const updatePrefs = useCallback((partial: Partial<ThemePrefs>) => {
    setPrefs((prev) => {
      const next: ThemePrefs = {
        mode: partial.mode ?? prev.mode,
        accent: partial.accent ?? prev.accent,
      };
      AsyncStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(next)).catch((err) => {
        console.error('[ThemeProvider] Failed to persist theme preferences:', err);
      });
      return next;
    });
  }, []);

  const scheme: 'light' | 'dark' =
    prefs.mode === 'auto'
      ? systemScheme === 'dark'
        ? 'dark'
        : 'light'
      : prefs.mode;

  const colors = useMemo<ThemeColors>(() => {
    const base = scheme === 'dark' ? darkColors : lightColors;
    const accentDef = accents[prefs.accent] ?? accents.blue;
    const accentColor = scheme === 'dark' ? accentDef.dark : accentDef.light;
    const accentSoftColor = scheme === 'dark' ? accentDef.darkSoft : accentDef.lightSoft;

    return {
      ...base,
      accent: accentColor,
      accentSoft: accentSoftColor,
      bubbleSelf: accentColor,
      bubbleSelfText: palette.white,
    };
  }, [scheme, prefs.accent]);

  const value = useMemo<Theme>(
    () => ({
      colors,
      spacing,
      radii,
      typography,
      scheme,
      prefs,
      updatePrefs,
    }),
    [colors, scheme, prefs, updatePrefs],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme must be used inside ThemeProvider');
  return theme;
}
