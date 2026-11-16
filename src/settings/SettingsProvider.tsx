import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { loadSettings, saveSettings } from './storage';
import { DEFAULT_SETTINGS, type Settings } from './types';

interface SettingsContextValue {
  settings: Settings;
  ready: boolean;
  update: (patch: Partial<Settings>) => void;
  reset: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    void loadSettings().then((stored) => {
      if (!mounted) return;
      setSettings(stored);
      setReady(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((previous) => {
      const next = { ...previous, ...patch };
      void saveSettings(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => update(DEFAULT_SETTINGS), [update]);

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, ready, update, reset }),
    [settings, ready, update, reset],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used inside SettingsProvider');
  return context;
}
