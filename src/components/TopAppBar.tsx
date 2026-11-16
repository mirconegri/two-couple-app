import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../theme/ThemeProvider';
import { spacing } from '../theme/tokens';
import { IconButton } from './IconButton';
import { Text } from './Text';

const SMALL_HEIGHT = 64;
const LARGE_HEIGHT = 152;
/** Scroll distance over which a large app bar folds into a small one. */
const APP_BAR_COLLAPSE = LARGE_HEIGHT - SMALL_HEIGHT;

export interface TopAppBarProps {
  title: string;
  /** Scroll offset of the content below; supplying it turns this into a large collapsing bar. */
  scrollY?: SharedValue<number>;
  onBack?: () => void;
  actions?: React.ReactNode;
}

export function TopAppBar({ title, scrollY, onBack, actions }: TopAppBarProps) {
  const { colors, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const collapsing = scrollY !== undefined;

  const containerStyle = useAnimatedStyle(() => {
    if (!collapsing) return {};
    const offset = scrollY.value;
    return {
      height:
        insets.top + interpolate(offset, [0, APP_BAR_COLLAPSE], [LARGE_HEIGHT, SMALL_HEIGHT], Extrapolation.CLAMP),
      backgroundColor: interpolateColor(
        offset,
        [0, APP_BAR_COLLAPSE],
        [colors.surface, colors.surfaceContainer],
      ),
    };
  }, [collapsing, colors, insets.top]);

  const largeTitleStyle = useAnimatedStyle(() => {
    if (!collapsing) return {};
    return {
      opacity: interpolate(scrollY.value, [0, APP_BAR_COLLAPSE * 0.6], [1, 0], Extrapolation.CLAMP),
      transform: [
        {
          translateY: interpolate(
            scrollY.value,
            [0, APP_BAR_COLLAPSE],
            [0, -12],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  }, [collapsing]);

  const smallTitleStyle = useAnimatedStyle(() => {
    if (!collapsing) return {};
    return {
      opacity: interpolate(
        scrollY.value,
        [APP_BAR_COLLAPSE * 0.55, APP_BAR_COLLAPSE],
        [0, 1],
        Extrapolation.CLAMP,
      ),
    };
  }, [collapsing]);

  return (
    <Animated.View
      style={[
        styles.container,
        { paddingTop: insets.top, backgroundColor: colors.surface },
        collapsing && containerStyle,
      ]}
    >
      <View style={styles.row}>
        {onBack ? (
          <IconButton icon="arrow-back" onPress={onBack} accessibilityLabel="Go back" />
        ) : (
          <View style={styles.leadingSpacer} />
        )}

        {collapsing ? (
          <Animated.Text
            numberOfLines={1}
            importantForAccessibility="no-hide-descendants"
            style={[typography.titleLarge, styles.smallTitle, { color: colors.onSurface }, smallTitleStyle]}
          >
            {title}
          </Animated.Text>
        ) : (
          <Text variant="titleLarge" numberOfLines={1} style={styles.smallTitle}>
            {title}
          </Text>
        )}

        <View style={styles.actions}>{actions}</View>
      </View>

      {collapsing ? (
        <Animated.Text
          accessibilityRole="header"
          numberOfLines={1}
          style={[typography.headlineMedium, styles.largeTitle, { color: colors.onSurface }, largeTitleStyle]}
        >
          {title}
        </Animated.Text>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden' },
  row: {
    height: SMALL_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  leadingSpacer: { width: spacing.md },
  smallTitle: { flex: 1, textAlign: 'center' },
  actions: { flexDirection: 'row', alignItems: 'center', minWidth: 48, justifyContent: 'flex-end' },
  largeTitle: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
  },
});
