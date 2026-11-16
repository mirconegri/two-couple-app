import type { BubbleShapeKey } from '../theme/tokens';
import { DEFAULT_SEED_COLOR } from '../theme/tokens';

export type ThemeMode = 'system' | 'light' | 'dark';
export type CalendarView = 'month' | 'agenda';
export type WeekStart = 0 | 1 | 6;
export type ChatDensity = 'cozy' | 'compact';

export interface Settings {
  themeMode: ThemeMode;
  /** Follow the wallpaper-derived Material You palette when the device supports it. */
  dynamicColor: boolean;
  seedColor: string;
  /** Force pure black surfaces in the dark scheme. */
  amoledBlack: boolean;
  /** Multiplier applied on top of the system font scale. */
  textScale: number;
  motion: boolean;
  haptics: boolean;
  bubbleShape: BubbleShapeKey;
  chatDensity: ChatDensity;
  calendarStartDay: WeekStart;
  calendarDefaultView: CalendarView;
  use24Hour: boolean;
}

export const TEXT_SCALE_OPTIONS = [0.85, 1, 1.15, 1.3] as const;

export const DEFAULT_SETTINGS: Settings = {
  themeMode: 'system',
  dynamicColor: true,
  seedColor: DEFAULT_SEED_COLOR,
  amoledBlack: false,
  textScale: 1,
  motion: true,
  haptics: true,
  bubbleShape: 'expressive',
  chatDensity: 'cozy',
  calendarStartDay: 1,
  calendarDefaultView: 'month',
  use24Hour: true,
};

function pick<T extends string | number>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

export function normalizeSettings(raw: unknown): Settings {
  const value = (raw ?? {}) as Partial<Settings>;
  const textScale = TEXT_SCALE_OPTIONS.find((option) => option === value.textScale);

  return {
    themeMode: pick(value.themeMode, ['system', 'light', 'dark'], DEFAULT_SETTINGS.themeMode),
    dynamicColor: bool(value.dynamicColor, DEFAULT_SETTINGS.dynamicColor),
    seedColor:
      typeof value.seedColor === 'string' && /^#[0-9a-f]{6}$/i.test(value.seedColor)
        ? value.seedColor
        : DEFAULT_SETTINGS.seedColor,
    amoledBlack: bool(value.amoledBlack, DEFAULT_SETTINGS.amoledBlack),
    textScale: textScale ?? DEFAULT_SETTINGS.textScale,
    motion: bool(value.motion, DEFAULT_SETTINGS.motion),
    haptics: bool(value.haptics, DEFAULT_SETTINGS.haptics),
    bubbleShape: pick(
      value.bubbleShape,
      ['expressive', 'rounded', 'square'],
      DEFAULT_SETTINGS.bubbleShape,
    ),
    chatDensity: pick(value.chatDensity, ['cozy', 'compact'], DEFAULT_SETTINGS.chatDensity),
    calendarStartDay: pick(value.calendarStartDay, [0, 1, 6], DEFAULT_SETTINGS.calendarStartDay),
    calendarDefaultView: pick(
      value.calendarDefaultView,
      ['month', 'agenda'],
      DEFAULT_SETTINGS.calendarDefaultView,
    ),
    use24Hour: bool(value.use24Hour, DEFAULT_SETTINGS.use24Hour),
  };
}
