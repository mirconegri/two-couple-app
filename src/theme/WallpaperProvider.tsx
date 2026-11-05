import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import {
  type WallpaperPrefs,
  type WallpaperId,
  type WallpaperScope,
  DEFAULT_WALLPAPER_PREFS,
  loadWallpaperPrefs,
  saveWallpaperPrefs,
} from './wallpaper';

interface WallpaperContextValue {
  prefs: WallpaperPrefs;
  setPreset: (id: WallpaperId) => Promise<void>;
  setCustomPhoto: (uri: string) => Promise<void>;
  setScope: (scope: WallpaperScope) => Promise<void>;
  resetToDefault: () => Promise<void>;
}

const WallpaperContext = createContext<WallpaperContextValue | null>(null);

export function WallpaperProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<WallpaperPrefs>(DEFAULT_WALLPAPER_PREFS);

  useEffect(() => {
    void (async () => {
      const loaded = await loadWallpaperPrefs();
      setPrefs(loaded);
    })();
  }, []);

  const setPreset = useCallback(async (id: WallpaperId) => {
    setPrefs((prev) => {
      const next: WallpaperPrefs = { ...prev, id };
      void saveWallpaperPrefs(next);
      return next;
    });
  }, []);

  const setCustomPhoto = useCallback(async (uri: string) => {
    setPrefs((prev) => {
      const next: WallpaperPrefs = { ...prev, id: 'custom', customUri: uri };
      void saveWallpaperPrefs(next);
      return next;
    });
  }, []);

  const setScope = useCallback(async (scope: WallpaperScope) => {
    setPrefs((prev) => {
      const next: WallpaperPrefs = { ...prev, scope };
      void saveWallpaperPrefs(next);
      return next;
    });
  }, []);

  const resetToDefault = useCallback(async () => {
    setPrefs(DEFAULT_WALLPAPER_PREFS);
    await saveWallpaperPrefs(DEFAULT_WALLPAPER_PREFS);
  }, []);

  const value = useMemo<WallpaperContextValue>(
    () => ({
      prefs,
      setPreset,
      setCustomPhoto,
      setScope,
      resetToDefault,
    }),
    [prefs, resetToDefault, setCustomPhoto, setPreset, setScope],
  );

  return (
    <WallpaperContext.Provider value={value}>
      {children}
    </WallpaperContext.Provider>
  );
}

export function useWallpaper(): WallpaperContextValue {
  const ctx = useContext(WallpaperContext);
  if (!ctx) {
    return {
      prefs: DEFAULT_WALLPAPER_PREFS,
      setPreset: async () => {},
      setCustomPhoto: async () => {},
      setScope: async () => {},
      resetToDefault: async () => {},
    };
  }
  return ctx;
}
