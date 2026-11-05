import AsyncStorage from '@react-native-async-storage/async-storage';

export type WallpaperId =
  | 'default'
  | 'hearts'
  | 'starlight'
  | 'sunset'
  | 'petals'
  | 'custom';

export type WallpaperScope = 'chat' | 'all';

export interface WallpaperPrefs {
  id: WallpaperId;
  customUri?: string | null;
  scope: WallpaperScope;
}

export const WALLPAPER_PRESETS: Array<{
  id: WallpaperId;
  title: string;
  subtitle: string;
  icon: string;
  previewColorLight: string;
  previewColorDark: string;
  accentTone: string;
}> = [
  {
    id: 'default',
    title: 'Minimal',
    subtitle: 'Tema standard senza pattern',
    icon: 'sparkles-outline',
    previewColorLight: '#F2F2F7',
    previewColorDark: '#1C1C1E',
    accentTone: '#8E8E93',
  },
  {
    id: 'hearts',
    title: 'Sweet Hearts',
    subtitle: 'Dolci cuori romantici',
    icon: 'heart',
    previewColorLight: '#FFF0F5',
    previewColorDark: '#2B121E',
    accentTone: '#FF2D55',
  },
  {
    id: 'starlight',
    title: 'Starlight',
    subtitle: 'Notte stellata romantica',
    icon: 'moon',
    previewColorLight: '#F0F4FF',
    previewColorDark: '#0D1326',
    accentTone: '#5856D6',
  },
  {
    id: 'sunset',
    title: 'Sunset Love',
    subtitle: 'Sfumature calde del tramonto',
    icon: 'sunny',
    previewColorLight: '#FFF5EB',
    previewColorDark: '#2B1B10',
    accentTone: '#FF9500',
  },
  {
    id: 'petals',
    title: 'Rose Petals',
    subtitle: 'Petali delicati di rosa',
    icon: 'flower',
    previewColorLight: '#FFF2F4',
    previewColorDark: '#261217',
    accentTone: '#E04066',
  },
];

const STORAGE_KEY = '@twocouple_wallpaper_prefs_v1';

export const DEFAULT_WALLPAPER_PREFS: WallpaperPrefs = {
  id: 'hearts',
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
