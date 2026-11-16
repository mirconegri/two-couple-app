import React from 'react';
import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { emphasized as emphasizeRole, type TypeRoleName } from '../theme/tokens';
import type { ColorScheme } from '../theme/color';

export interface TextProps extends RNTextProps {
  variant?: TypeRoleName;
  color?: keyof ColorScheme;
  /** Uses the heavier Material 3 emphasized weight for this role. */
  strong?: boolean;
}

export function Text({
  variant = 'bodyMedium',
  color = 'onSurface',
  strong = false,
  style,
  ...rest
}: TextProps) {
  const { colors, typography } = useTheme();
  const role = typography[variant];
  const typeStyle: TextStyle = strong ? emphasizeRole(variant, role) : role;

  return <RNText {...rest} style={[typeStyle, { color: colors[color] }, style]} />;
}
