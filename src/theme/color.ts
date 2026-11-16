import type { Material3Scheme } from '@pchmn/expo-material3-theme';

export type Scheme = 'light' | 'dark';

/**
 * Material 3 color roles.
 *
 * `bubbleSelf`/`bubbleOther` are the only non-standard roles: the chat needs a
 * pair of container colors that stay legible in both schemes.
 */
export interface ColorScheme {
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;
  tertiary: string;
  onTertiary: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;
  error: string;
  onError: string;
  errorContainer: string;
  onErrorContainer: string;
  surface: string;
  onSurface: string;
  surfaceVariant: string;
  onSurfaceVariant: string;
  surfaceContainerLowest: string;
  surfaceContainerLow: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  surfaceContainerHighest: string;
  surfaceDim: string;
  surfaceBright: string;
  outline: string;
  outlineVariant: string;
  inverseSurface: string;
  inverseOnSurface: string;
  inversePrimary: string;
  scrim: string;
  shadow: string;
  bubbleSelf: string;
  onBubbleSelf: string;
  bubbleOther: string;
  onBubbleOther: string;
}

/** Scale an `#rrggbb` color toward black. */
function darken(hex: string, factor: number): string {
  const value = Number.parseInt(hex.slice(1), 16);
  const channel = (shift: number) =>
    Math.round(((value >> shift) & 0xff) * factor)
      .toString(16)
      .padStart(2, '0');
  return `#${channel(16)}${channel(8)}${channel(0)}`;
}

/** `#rrggbb` plus an alpha channel, as an `rgba()` string React Native accepts. */
export function withAlpha(hex: string, alpha: number): string {
  const value = Number.parseInt(hex.slice(1), 16);
  const r = (value >> 16) & 0xff;
  const g = (value >> 8) & 0xff;
  const b = value & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Relative luminance, used to pick a legible foreground over an arbitrary color. */
export function isDarkColor(hex: string): boolean {
  const value = Number.parseInt(hex.slice(1), 16);
  const r = ((value >> 16) & 0xff) / 255;
  const g = ((value >> 8) & 0xff) / 255;
  const b = (value & 0xff) / 255;
  const linear = (channel: number) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b) < 0.45;
}

export function buildColorScheme(
  material: Material3Scheme,
  scheme: Scheme,
  amoled: boolean,
): ColorScheme {
  const surface =
    amoled && scheme === 'dark'
      ? {
          surface: '#000000',
          surfaceDim: '#000000',
          surfaceContainerLowest: '#000000',
          surfaceContainerLow: darken(material.surfaceContainerLow, 0.5),
          surfaceContainer: darken(material.surfaceContainer, 0.5),
          surfaceContainerHigh: darken(material.surfaceContainerHigh, 0.5),
          surfaceContainerHighest: darken(material.surfaceContainerHighest, 0.5),
          surfaceBright: darken(material.surfaceBright, 0.5),
        }
      : {
          surface: material.surface,
          surfaceDim: material.surfaceDim,
          surfaceContainerLowest: material.surfaceContainerLowest,
          surfaceContainerLow: material.surfaceContainerLow,
          surfaceContainer: material.surfaceContainer,
          surfaceContainerHigh: material.surfaceContainerHigh,
          surfaceContainerHighest: material.surfaceContainerHighest,
          surfaceBright: material.surfaceBright,
        };

  return {
    primary: material.primary,
    onPrimary: material.onPrimary,
    primaryContainer: material.primaryContainer,
    onPrimaryContainer: material.onPrimaryContainer,
    secondary: material.secondary,
    onSecondary: material.onSecondary,
    secondaryContainer: material.secondaryContainer,
    onSecondaryContainer: material.onSecondaryContainer,
    tertiary: material.tertiary,
    onTertiary: material.onTertiary,
    tertiaryContainer: material.tertiaryContainer,
    onTertiaryContainer: material.onTertiaryContainer,
    error: material.error,
    onError: material.onError,
    errorContainer: material.errorContainer,
    onErrorContainer: material.onErrorContainer,
    ...surface,
    onSurface: material.onSurface,
    surfaceVariant: material.surfaceVariant,
    onSurfaceVariant: material.onSurfaceVariant,
    outline: material.outline,
    outlineVariant: material.outlineVariant,
    inverseSurface: material.inverseSurface,
    inverseOnSurface: material.inverseOnSurface,
    inversePrimary: material.inversePrimary,
    scrim: material.scrim,
    shadow: material.shadow,
    bubbleSelf: material.primaryContainer,
    onBubbleSelf: material.onPrimaryContainer,
    bubbleOther: material.surfaceContainerHigh,
    onBubbleOther: material.onSurface,
  };
}
