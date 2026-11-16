import AsyncStorage from '@react-native-async-storage/async-storage';

export type WallpaperId = 'default' | 'hearts' | 'starlight' | 'sunset' | 'petals' | 'custom';

export type WallpaperScope = 'chat' | 'all';

export interface WallpaperPrefs {
  id: WallpaperId;
  customUri?: string | null;
  scope: WallpaperScope;
}

export interface WallpaperPreset {
  id: WallpaperId;
  title: string;
  subtitle: string;
  icon: string;
}

/** Pattern tints come from the active Material 3 palette, so these stay colourless. */
export const WALLPAPER_PRESETS: WallpaperPreset[] = [
  { id: 'default', title: 'Plain', subtitle: 'No pattern', icon: 'remove-outline' },
  { id: 'hearts', title: 'Hearts', subtitle: 'Soft floating hearts', icon: 'heart' },
  { id: 'starlight', title: 'Starlight', subtitle: 'Quiet night sky', icon: 'moon' },
  { id: 'sunset', title: 'Sunset', subtitle: 'Warm evening glow', icon: 'sunny' },
  { id: 'petals', title: 'Petals', subtitle: 'Scattered blossoms', icon: 'flower' },
];

const STORAGE_KEY = '@twocouple_wallpaper_prefs_v1';

export const DEFAULT_WALLPAPER_PREFS: WallpaperPrefs = {
  id: 'default',
  customUri: null,
  scope: 'chat',
};

export async function loadWallpaperPrefs(): Promise<WallpaperPrefs> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_WALLPAPER_PREFS;
    const parsed = JSON.parse(raw) as Partial<WallpaperPrefs>;
    return {
      id: parsed.id ?? DEFAULT_WALLPAPER_PREFS.id,
      customUri: parsed.customUri ?? null,
      scope: parsed.scope ?? DEFAULT_WALLPAPER_PREFS.scope,
    };
  } catch {
    return DEFAULT_WALLPAPER_PREFS;
  }
}

export async function saveWallpaperPrefs(prefs: WallpaperPrefs): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Best-effort persistence
  }
}
