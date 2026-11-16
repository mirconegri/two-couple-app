import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_SETTINGS, normalizeSettings, type Settings } from './types';

const STORAGE_KEY = 'twocouple.settings.v1';

export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? normalizeSettings(JSON.parse(raw)) : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Losing a preference is not worth interrupting the user for.
  }
}
