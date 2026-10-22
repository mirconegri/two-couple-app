import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';

interface ListSectionProps {
  title?: string;
  footer?: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

export function ListSection({ title, footer, children, style }: ListSectionProps) {
  const { colors, radii, spacing, typography } = useTheme();

  const childArray = React.Children.toArray(children).filter(Boolean);

  return (
    <View style={[styles.wrap, { marginBottom: spacing.xl }, style]}>
      {title ? (
        <Text
          style={[
            typography.footnote,
            styles.sectionTitle,
            { color: colors.textMuted, paddingHorizontal: spacing.lg, marginBottom: spacing.xs },
          ]}
        >
          {title.toUpperCase()}
        </Text>
      ) : null}

      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.surface,
            borderRadius: radii.lg,
            borderColor: colors.border,
          },
        ]}
      >
        {childArray.map((child, index) => (
          <React.Fragment key={index}>
            {child}
            {index < childArray.length - 1 ? (
              <View
                style={[
                  styles.divider,
                  {
                    backgroundColor: colors.border,
                    marginLeft: spacing.lg,
                  },
                ]}
              />
            ) : null}
          </React.Fragment>
        ))}
      </View>

      {footer ? (
        <Text
          style={[
            typography.footnote,
            styles.sectionFooter,
            { color: colors.textMuted, paddingHorizontal: spacing.lg, marginTop: spacing.xs },
          ]}
        >
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  sectionTitle: {
    letterSpacing: -0.08,
  },
  sectionFooter: {
    lineHeight: 18,
  },
  container: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
});
