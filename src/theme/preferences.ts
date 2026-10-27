export type ThemeMode = 'auto' | 'light' | 'dark';

export type AccentKey =
  | 'blue'
  | 'green'
  | 'indigo'
  | 'orange'
  | 'pink'
  | 'purple'
  | 'teal';

export interface ThemePrefs {
  mode: ThemeMode;
  accent: AccentKey;
}

export const DEFAULT_PREFS: ThemePrefs = { mode: 'auto', accent: 'blue' };
export const PREFS_STORAGE_KEY = 'twocouple.theme.prefs.v1';

export interface AccentDefinition {
  label: string;
  light: string;
  dark: string;
  lightSoft: string;
  darkSoft: string;
}

export const accents: Record<AccentKey, AccentDefinition> = {
  blue: {
    label: 'Blu',
    light: '#007AFF',
    dark: '#0A84FF',
    lightSoft: 'rgba(0, 122, 255, 0.12)',
    darkSoft: 'rgba(10, 132, 255, 0.18)',
  },
  green: {
    label: 'Verde',
    light: '#34C759',
    dark: '#30D158',
    lightSoft: 'rgba(52, 199, 89, 0.12)',
    darkSoft: 'rgba(48, 209, 88, 0.18)',
  },
  indigo: {
    label: 'Indaco',
    light: '#5856D6',
    dark: '#5E5CE6',
    lightSoft: 'rgba(88, 86, 214, 0.12)',
    darkSoft: 'rgba(94, 92, 230, 0.18)',
  },
  orange: {
    label: 'Arancio',
    light: '#FF9500',
    dark: '#FF9F0A',
    lightSoft: 'rgba(255, 149, 0, 0.12)',
    darkSoft: 'rgba(255, 159, 10, 0.18)',
  },
  pink: {
    label: 'Rosa',
    light: '#FF2D55',
    dark: '#FF375F',
    lightSoft: 'rgba(255, 45, 85, 0.12)',
    darkSoft: 'rgba(255, 55, 95, 0.18)',
  },
  purple: {
    label: 'Viola',
    light: '#AF52DE',
    dark: '#BF5AF2',
    lightSoft: 'rgba(175, 82, 222, 0.12)',
    darkSoft: 'rgba(191, 90, 242, 0.18)',
  },
  teal: {
    label: 'Verde acqua',
    light: '#5AC8FA',
    dark: '#64D2FF',
    lightSoft: 'rgba(90, 200, 250, 0.12)',
    darkSoft: 'rgba(100, 210, 255, 0.18)',
  },
};

export const accentKeys: readonly AccentKey[] = [
  'blue',
  'green',
  'indigo',
  'orange',
  'pink',
  'purple',
  'teal',
];
