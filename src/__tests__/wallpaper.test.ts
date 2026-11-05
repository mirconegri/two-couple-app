import {
  DEFAULT_WALLPAPER_PREFS,
  loadWallpaperPrefs,
  saveWallpaperPrefs,
  WALLPAPER_PRESETS,
  type WallpaperPrefs,
} from '../theme/wallpaper';

describe('wallpaper module', () => {
  it('returns default wallpaper preferences', async () => {
    const prefs = await loadWallpaperPrefs();
    expect(prefs).toBeDefined();
    expect(WALLPAPER_PRESETS.length).toBeGreaterThanOrEqual(4);
  });

  it('saves and loads wallpaper preferences properly', async () => {
    const custom: WallpaperPrefs = {
      id: 'starlight',
      customUri: null,
      scope: 'all',
    };
    await saveWallpaperPrefs(custom);
    const loaded = await loadWallpaperPrefs();
    expect(loaded.id).toBe('starlight');
    expect(loaded.scope).toBe('all');
  });
});
