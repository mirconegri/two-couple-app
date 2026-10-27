export const palette = {
  // Apple System Colors (Light & Dark)
  systemBlue: '#007AFF',
  systemBlueDark: '#0A84FF',
  systemGreen: '#34C759',
  systemGreenDark: '#30D158',
  systemIndigo: '#5856D6',
  systemIndigoDark: '#5E5CE6',
  systemOrange: '#FF9500',
  systemOrangeDark: '#FF9F0A',
  systemPink: '#FF2D55',
  systemPinkDark: '#FF375F',
  systemPurple: '#AF52DE',
  systemPurpleDark: '#BF5AF2',
  systemRed: '#FF3B30',
  systemRedDark: '#FF453A',
  systemTeal: '#5AC8FA',
  systemTealDark: '#64D2FF',
  systemYellow: '#FFCC00',
  systemYellowDark: '#FFD60A',

  // Apple System Grays (Light)
  systemGray: '#8E8E93',
  systemGray2: '#AEAEB2',
  systemGray3: '#C7C7CC',
  systemGray4: '#D1D1D6',
  systemGray5: '#E5E5EA',
  systemGray6: '#F2F2F7',

  // Apple System Grays (Dark)
  systemDarkGray: '#8E8E93',
  systemDarkGray2: '#636366',
  systemDarkGray3: '#48484A',
  systemDarkGray4: '#3A3A3C',
  systemDarkGray5: '#2C2C2E',
  systemDarkGray6: '#1C1C1E',

  // Neutral
  white: '#FFFFFF',
  black: '#000000',

  // Semantics
  danger: '#FF3B30',
  dangerSoft: '#FFE5E5',
  warning: '#FF9500',
  warningSoft: '#FFF3E0',
  success: '#34C759',
  successSoft: '#E8F5E9',

  // Pastel Note Colors
  noteYellow: '#FFF4CC',
  noteGreen: '#D7F5DD',
  noteBlue: '#D8ECFF',
  notePink: '#FFE0E6',
  notePurple: '#EAE2FD',
  noteGray: '#EBEBF0',
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
  xs: 6,
  sm: 8,
  md: 10,
  lg: 12,
  xl: 16,
  xxl: 22,
  pill: 999,
} as const;

export const notePastels: readonly string[] = [
  palette.noteYellow,
  palette.noteGreen,
  palette.noteBlue,
  palette.notePink,
  palette.notePurple,
  palette.noteGray,
];

export const eventPalette: readonly string[] = [
  palette.systemRed,
  palette.systemOrange,
  palette.systemYellow,
  palette.systemGreen,
  palette.systemBlue,
  palette.systemIndigo,
  palette.systemPurple,
  palette.systemPink,
];

export const typography = {
  // Apple Typography Scale
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: '700' as const, letterSpacing: 0.37 },
  title1: { fontSize: 28, lineHeight: 34, fontWeight: '700' as const, letterSpacing: 0.36 },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: '700' as const, letterSpacing: 0.35 },
  title3: { fontSize: 20, lineHeight: 25, fontWeight: '600' as const, letterSpacing: 0.38 },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600' as const, letterSpacing: -0.41 },
  body: { fontSize: 17, lineHeight: 22, fontWeight: '400' as const, letterSpacing: -0.41 },
  callout: { fontSize: 16, lineHeight: 21, fontWeight: '400' as const, letterSpacing: -0.32 },
  subheadline: { fontSize: 15, lineHeight: 20, fontWeight: '400' as const, letterSpacing: -0.24 },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const, letterSpacing: -0.08 },
  caption1: { fontSize: 12, lineHeight: 16, fontWeight: '400' as const, letterSpacing: 0 },
  caption2: { fontSize: 11, lineHeight: 13, fontWeight: '400' as const, letterSpacing: 0.07 },

  // Compatibility aliases
  display: { fontSize: 34, lineHeight: 41, fontWeight: '700' as const, letterSpacing: 0.37 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700' as const, letterSpacing: 0.36 },
  heading: { fontSize: 17, lineHeight: 22, fontWeight: '600' as const, letterSpacing: -0.41 },
  bodyStrong: { fontSize: 17, lineHeight: 22, fontWeight: '600' as const, letterSpacing: -0.41 },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const, letterSpacing: -0.08 },
  micro: { fontSize: 11, lineHeight: 13, fontWeight: '600' as const, letterSpacing: 0.07 },
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
  groupedBackground: string;
  separator: string;
}

export const lightColors: ThemeColors = {
  background: palette.systemGray6,        // #F2F2F7 (Apple Grouped Background)
  surface: palette.white,                 // #FFFFFF (Apple Grouped Card)
  surfaceMuted: palette.systemGray5,      // #E5E5EA
  border: '#C6C6C8',                      // Apple standard table separator
  borderStrong: palette.systemGray3,      // #C7C7CC
  text: palette.black,                    // Primary Label
  textMuted: '#6C6C70',                   // Secondary Label
  textFaint: palette.systemGray,          // Tertiary Label
  accent: palette.systemBlue,             // Apple System Blue #007AFF
  accentSoft: 'rgba(0, 122, 255, 0.12)',
  onAccent: palette.white,
  bubbleSelf: palette.systemBlue,         // iMessage Blue #007AFF
  bubbleSelfText: palette.white,
  bubbleOther: '#E9E9EB',                 // iMessage gray
  bubbleOtherText: palette.black,
  danger: palette.systemRed,
  dangerSoft: 'rgba(255, 59, 48, 0.12)',
  warning: palette.systemOrange,
  warningSoft: 'rgba(255, 149, 0, 0.12)',
  success: palette.systemGreen,
  successSoft: 'rgba(52, 199, 89, 0.12)',
  overlay: 'rgba(0, 0, 0, 0.4)',
  groupedBackground: palette.systemGray6,
  separator: '#C6C6C8',
};

export const darkColors: ThemeColors = {
  background: palette.black,              // #000000 (Apple Dark Grouped Background)
  surface: palette.systemDarkGray6,       // #1C1C1E (Apple Dark Grouped Card)
  surfaceMuted: palette.systemDarkGray5,  // #2C2C2E
  border: '#38383A',                      // Apple dark separator
  borderStrong: palette.systemDarkGray3,  // #48484A
  text: palette.white,                    // Primary Label
  textMuted: palette.systemGray,          // Secondary Label
  textFaint: palette.systemDarkGray2,     // Tertiary Label
  accent: palette.systemBlueDark,         // Apple Dark System Blue #0A84FF
  accentSoft: 'rgba(10, 132, 255, 0.18)',
  onAccent: palette.white,
  bubbleSelf: palette.systemBlueDark,     // iMessage Dark Blue #0A84FF
  bubbleSelfText: palette.white,
  bubbleOther: '#262628',                 // iMessage dark gray
  bubbleOtherText: palette.white,
  danger: palette.systemRedDark,
  dangerSoft: 'rgba(255, 69, 58, 0.18)',
  warning: palette.systemOrangeDark,
  warningSoft: 'rgba(255, 159, 10, 0.18)',
  success: palette.systemGreenDark,
  successSoft: 'rgba(48, 209, 88, 0.18)',
  overlay: 'rgba(0, 0, 0, 0.65)',
  groupedBackground: palette.black,
  separator: '#38383A',
};
