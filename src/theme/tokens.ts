import type { TextStyle } from 'react-native';

/** Material 3 spacing scale, 4dp grid. */
export const spacing = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/** Material 3 Expressive corner radius scale. */
export const shape = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  lgIncreased: 20,
  xl: 28,
  xlIncreased: 32,
  xxl: 48,
  full: 999,
} as const;

/** Material 3 shadow elevation, in dp. */
export const elevation = {
  level0: 0,
  level1: 1,
  level2: 3,
  level3: 6,
  level4: 8,
  level5: 12,
} as const;

/** Material 3 state layer opacities. */
export const stateLayer = {
  hover: 0.08,
  focus: 0.1,
  pressed: 0.1,
  dragged: 0.16,
  disabledContainer: 0.1,
  disabledContent: 0.38,
} as const;

/** Minimum touch target enforced by Material 3. */
export const MIN_TOUCH_TARGET = 48;

/** Material 3 button heights, in dp. */
export const buttonHeight = {
  small: 40,
  medium: 56,
} as const;

export const iconSize = {
  sm: 18,
  md: 24,
  lg: 32,
} as const;

/** Corner radii for the three chat bubble styles offered in settings. */
export const bubbleShapes = {
  expressive: { self: shape.xl, other: shape.xl, tail: shape.xs },
  rounded: { self: shape.lg, other: shape.lg, tail: shape.xs },
  square: { self: shape.xs, other: shape.xs, tail: shape.none },
} as const;

export type BubbleShapeKey = keyof typeof bubbleShapes;

const WEIGHT = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const satisfies Record<string, TextStyle['fontWeight']>;

/** Material 3 type scale. */
const typeScale = {
  displayLarge: { fontSize: 57, lineHeight: 64, fontWeight: WEIGHT.regular, letterSpacing: -0.25 },
  displayMedium: { fontSize: 45, lineHeight: 52, fontWeight: WEIGHT.regular, letterSpacing: 0 },
  displaySmall: { fontSize: 36, lineHeight: 44, fontWeight: WEIGHT.regular, letterSpacing: 0 },
  headlineLarge: { fontSize: 32, lineHeight: 40, fontWeight: WEIGHT.regular, letterSpacing: 0 },
  headlineMedium: { fontSize: 28, lineHeight: 36, fontWeight: WEIGHT.regular, letterSpacing: 0 },
  headlineSmall: { fontSize: 24, lineHeight: 32, fontWeight: WEIGHT.regular, letterSpacing: 0 },
  titleLarge: { fontSize: 22, lineHeight: 28, fontWeight: WEIGHT.regular, letterSpacing: 0 },
  titleMedium: { fontSize: 16, lineHeight: 24, fontWeight: WEIGHT.medium, letterSpacing: 0.15 },
  titleSmall: { fontSize: 14, lineHeight: 20, fontWeight: WEIGHT.medium, letterSpacing: 0.1 },
  bodyLarge: { fontSize: 16, lineHeight: 24, fontWeight: WEIGHT.regular, letterSpacing: 0.5 },
  bodyMedium: { fontSize: 14, lineHeight: 20, fontWeight: WEIGHT.regular, letterSpacing: 0.25 },
  bodySmall: { fontSize: 12, lineHeight: 16, fontWeight: WEIGHT.regular, letterSpacing: 0.4 },
  labelLarge: { fontSize: 14, lineHeight: 20, fontWeight: WEIGHT.medium, letterSpacing: 0.1 },
  labelMedium: { fontSize: 12, lineHeight: 16, fontWeight: WEIGHT.medium, letterSpacing: 0.5 },
  labelSmall: { fontSize: 11, lineHeight: 16, fontWeight: WEIGHT.medium, letterSpacing: 0.5 },
} as const;

export type TypeRoleName = keyof typeof typeScale;

const emphasizedWeights: Record<TypeRoleName, TextStyle['fontWeight']> = {
  displayLarge: WEIGHT.medium,
  displayMedium: WEIGHT.medium,
  displaySmall: WEIGHT.medium,
  headlineLarge: WEIGHT.medium,
  headlineMedium: WEIGHT.medium,
  headlineSmall: WEIGHT.medium,
  titleLarge: WEIGHT.medium,
  titleMedium: WEIGHT.bold,
  titleSmall: WEIGHT.bold,
  bodyLarge: WEIGHT.medium,
  bodyMedium: WEIGHT.medium,
  bodySmall: WEIGHT.medium,
  labelLarge: WEIGHT.bold,
  labelMedium: WEIGHT.bold,
  labelSmall: WEIGHT.bold,
};

/** Type styles scaled by the user preference; system font scaling still applies on top. */
export function buildTypography(scale: number): Record<TypeRoleName, TextStyle> {
  const result = {} as Record<TypeRoleName, TextStyle>;
  for (const name of Object.keys(typeScale) as TypeRoleName[]) {
    const role = typeScale[name];
    result[name] = {
      fontSize: Math.round(role.fontSize * scale),
      lineHeight: Math.round(role.lineHeight * scale),
      fontWeight: role.fontWeight,
      letterSpacing: role.letterSpacing,
    };
  }
  return result;
}

/** Heavier variant of a type role, used where a screen needs expressive emphasis. */
export function emphasized(name: TypeRoleName, role: TextStyle): TextStyle {
  return { ...role, fontWeight: emphasizedWeights[name] };
}

/** Curated seed colors for the theme picker, spread across the Material 3 hue families. */
export const seedPalette = [
  { name: 'Indigo', value: '#4F5B92' },
  { name: 'Blue', value: '#3D6B99' },
  { name: 'Teal', value: '#2E6B62' },
  { name: 'Green', value: '#3F6B3A' },
  { name: 'Lime', value: '#5C6B2E' },
  { name: 'Amber', value: '#7A5B1E' },
  { name: 'Orange', value: '#8A4F2A' },
  { name: 'Red', value: '#8F3B3B' },
  { name: 'Rose', value: '#8E3F5C' },
  { name: 'Purple', value: '#6C4A8F' },
  { name: 'Slate', value: '#4A5568' },
  { name: 'Sand', value: '#6B5D4F' },
] as const;

export const DEFAULT_SEED_COLOR = '#4F5B92';

/** Event accent colors. Stored on the row, so these are content values, not theme roles. */
export const eventColors = [
  '#B3261E',
  '#8B5000',
  '#7A5900',
  '#3F6832',
  '#00696D',
  '#0061A4',
  '#4F5B92',
  '#7D5260',
] as const;

/** Note backgrounds. Values kept from earlier releases so saved notes keep their color. */
export const noteColors = [
  '#FFF4CC',
  '#D7F5DD',
  '#D8ECFF',
  '#FFE0E6',
  '#EAE2FD',
  '#EBEBF0',
] as const;
