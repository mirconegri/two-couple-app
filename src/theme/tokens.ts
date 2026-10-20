export const palette = {
  teal900: '#062B27',
  teal800: '#0B3B36',
  teal700: '#0F524B',
  teal600: '#0F766E',
  teal500: '#149C90',
  teal300: '#5FC9BC',
  teal100: '#D7F0EC',

  sand50: '#FBF9F6',
  sand100: '#F4F1EC',
  sand200: '#E8E3DA',

  ink900: '#131615',
  ink700: '#3A413F',
  ink500: '#66706D',
  ink300: '#9AA4A1',

  white: '#FFFFFF',
  black: '#0A0C0B',

  danger: '#B42318',
  dangerSoft: '#FEE4E2',
  warning: '#B54708',
  warningSoft: '#FEF0C7',
  success: '#0E7C5A',
  successSoft: '#D5F2E6',
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 30, lineHeight: 36, fontWeight: '700' as const, letterSpacing: -0.6 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700' as const, letterSpacing: -0.3 },
  heading: { fontSize: 17, lineHeight: 22, fontWeight: '600' as const },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '400' as const },
  bodyStrong: { fontSize: 15, lineHeight: 21, fontWeight: '600' as const },
  caption: { fontSize: 12.5, lineHeight: 17, fontWeight: '500' as const },
  micro: { fontSize: 11, lineHeight: 14, fontWeight: '600' as const },
} as const;

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textFaint: string;
  accent: string;
  accentSoft: string;
  onAccent: string;
  bubbleSelf: string;
  bubbleSelfText: string;
  bubbleOther: string;
  bubbleOtherText: string;
  danger: string;
  dangerSoft: string;
  warning: string;
  warningSoft: string;
  success: string;
  successSoft: string;
  overlay: string;
}

export const lightColors: ThemeColors = {
  background: palette.sand50,
  surface: palette.white,
  surfaceMuted: palette.sand100,
  border: palette.sand200,
  borderStrong: '#DAD3C7',
  text: palette.ink900,
  textMuted: palette.ink500,
  textFaint: palette.ink300,
  accent: palette.teal600,
  accentSoft: palette.teal100,
  onAccent: palette.white,
  bubbleSelf: palette.teal600,
  bubbleSelfText: palette.white,
  bubbleOther: palette.white,
  bubbleOtherText: palette.ink900,
  danger: palette.danger,
  dangerSoft: palette.dangerSoft,
  warning: palette.warning,
  warningSoft: palette.warningSoft,
  success: palette.success,
  successSoft: palette.successSoft,
  overlay: 'rgba(10, 12, 11, 0.45)',
};

export const darkColors: ThemeColors = {
  background: '#0B0F0E',
  surface: '#141917',
  surfaceMuted: '#1B211F',
  border: '#232A28',
  borderStrong: '#2E3634',
  text: '#F3F5F4',
  textMuted: '#A5B0AD',
  textFaint: '#6E7A77',
  accent: palette.teal300,
  accentSoft: 'rgba(95, 201, 188, 0.14)',
  onAccent: '#04211D',
  bubbleSelf: palette.teal700,
  bubbleSelfText: '#F3F5F4',
  bubbleOther: '#1B211F',
  bubbleOtherText: '#F3F5F4',
  danger: '#F97066',
  dangerSoft: 'rgba(249, 112, 102, 0.16)',
  warning: '#FDB022',
  warningSoft: 'rgba(253, 176, 34, 0.16)',
  success: '#5FD3A8',
  successSoft: 'rgba(95, 211, 168, 0.16)',
  overlay: 'rgba(0, 0, 0, 0.6)',
};
