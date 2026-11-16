import React, { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { Message } from '../types';
import { useTheme } from '../theme/ThemeProvider';
import { useSettings } from '../settings/SettingsProvider';
import { parseStickerMessage } from '../theme/stickers';
import {
  getCachedSignedStickerUrl,
  getSignedStickerUrl,
  invalidateSignedStickerUrl,
} from '../theme/stickerStorage';
import { PressableScale } from './PressableScale';
import { Text } from './Text';
import { LoadingIndicator } from './LoadingIndicator';
import { bubbleShapes, shape, spacing } from '../theme/tokens';
import { spring } from '../theme/motion';

function StickerMedia({ type, value }: { type: 'image' | 'storage'; value: string }) {
  const { colors } = useTheme();
  const [uri, setUri] = useState<string | null>(() =>
    type === 'storage' ? getCachedSignedStickerUrl(value) : value,
  );
  const [loading, setLoading] = useState(() => type === 'storage' && !getCachedSignedStickerUrl(value));
  const [failed, setFailed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (type !== 'storage') {
      setUri(value);
      setLoading(false);
      setFailed(false);
      return;
    }

    let cancelled = false;
    const cached = getCachedSignedStickerUrl(value);
    if (cached && retryCount === 0) {
      setUri(cached);
      setLoading(false);
      setFailed(false);
      return;
    }

    setLoading(true);
    setFailed(false);
    void getSignedStickerUrl(value).then((signedUrl) => {
      if (cancelled) return;
      if (signedUrl) {
        setUri(signedUrl);
        setFailed(false);
      } else {
        setFailed(true);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [retryCount, type, value]);

  if (loading) {
    return (
      <View style={[styles.stickerImage, styles.stickerPlaceholder]}>
        <LoadingIndicator size={24} />
      </View>
    );
  }

  if (failed || !uri) {
    return (
      <PressableScale
        onPress={
          type === 'storage'
            ? () => {
                void invalidateSignedStickerUrl(value).then(() => setRetryCount((count) => count + 1));
              }
            : undefined
        }
        disabled={type !== 'storage'}
        accessibilityLabel={type === 'storage' ? 'Retry loading sticker' : 'Sticker unavailable'}
        style={[styles.stickerImage, styles.stickerPlaceholder]}
      >
        <Ionicons
          name={type === 'storage' ? 'refresh' : 'image-outline'}
          size={24}
          color={colors.onSurfaceVariant}
        />
      </PressableScale>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={styles.stickerImage}
      resizeMode="contain"
      onError={() => {
        if (type === 'storage') void invalidateSignedStickerUrl(value);
        setFailed(true);
      }}
    />
  );
}

function PendingClock({ color }: { color: string }) {
  const { reducedMotion } = useTheme();
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (reducedMotion) {
      opacity.value = 1;
      return;
    }
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
    return () => cancelAnimation(opacity);
  }, [opacity, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={animatedStyle}>
      <Ionicons name="time-outline" size={13} color={color} />
    </Animated.View>
  );
}

/** Read state pops once when the partner opens the chat, so the change is noticed. */
function ReceiptChecks({ read, delivered, color }: { read: boolean; delivered: boolean; color: string }) {
  const { colors, reducedMotion } = useTheme();
  const scale = useSharedValue(1);
  const wasDelivered = useRef(delivered && !read);

  useEffect(() => {
    if (read && wasDelivered.current && !reducedMotion) {
      scale.value = withSequence(withSpring(1.25, spring.spatialFast), withSpring(1, spring.spatialFast));
      wasDelivered.current = false;
    }
  }, [read, reducedMotion, scale]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  if (!delivered && !read) {
    return <Ionicons name="checkmark" size={14} color={color} />;
  }

  return (
    <Animated.View style={[styles.checks, animatedStyle]}>
      <Ionicons name="checkmark" size={14} color={read ? colors.primary : color} />
      <Ionicons
        name="checkmark"
        size={14}
        color={read ? colors.primary : color}
        style={styles.secondCheck}
      />
    </Animated.View>
  );
}

function StatusRow({
  message,
  isMine,
  color,
  use24Hour,
  onRetry,
}: {
  message: Message;
  isMine: boolean;
  color: string;
  use24Hour: boolean;
  onRetry: (id: string) => void;
}) {
  const { colors } = useTheme();
  const pending = message.syncStatus === 'pending';
  const failed = message.syncStatus === 'failed';

  return (
    <View style={styles.status}>
      <Text variant="labelSmall" style={{ color }}>
        {format(new Date(message.clientCreatedAt), use24Hour ? 'HH:mm' : 'h:mm a')}
      </Text>

      {!isMine ? null : failed ? (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Message not sent, tap to retry"
          onPress={() => onRetry(message.id)}
          hitSlop={12}
          scaleTo={0.88}
        >
          <Ionicons name="alert-circle" size={14} color={colors.error} />
        </PressableScale>
      ) : pending ? (
        <PendingClock color={color} />
      ) : (
        <ReceiptChecks read={Boolean(message.readAt)} delivered={Boolean(message.deliveredAt)} color={color} />
      )}
    </View>
  );
}

export interface MessageBubbleProps {
  message: Message;
  isMine: boolean;
  senderName: string;
  /** First message of a run from this sender: show the name above it. */
  isGroupStart: boolean;
  /** Last message of a run: rounded tail and the status row. */
  isGroupEnd: boolean;
  onRetry: (id: string) => void;
}

export function MessageBubble({
  message,
  isMine,
  senderName,
  isGroupStart,
  isGroupEnd,
  onRetry,
}: MessageBubbleProps) {
  const { colors, reducedMotion } = useTheme();
  const { settings } = useSettings();
  const { use24Hour, chatDensity, bubbleShape } = settings;

  const failed = message.syncStatus === 'failed';
  const pending = message.syncStatus === 'pending';
  const sticker = parseStickerMessage(message.body);

  const radius = bubbleShapes[bubbleShape];
  const corner = isMine ? radius.self : radius.other;
  const tail = isGroupEnd ? radius.tail : corner;
  const background = isMine ? colors.bubbleSelf : colors.bubbleOther;
  const onBubble = isMine ? colors.onBubbleSelf : colors.onBubbleOther;
  const metaColor = isMine ? colors.onBubbleSelf : colors.onSurfaceVariant;
  const gap = chatDensity === 'compact' ? 2 : 4;
  const padding = chatDensity === 'compact' ? spacing.sm : spacing.md;

  const bubbleStyle = {
    backgroundColor: failed ? colors.errorContainer : background,
    borderTopLeftRadius: isMine ? corner : tail,
    borderTopRightRadius: isMine ? tail : corner,
    borderBottomLeftRadius: isMine ? corner : isGroupEnd ? tail : corner,
    borderBottomRightRadius: isMine ? (isGroupEnd ? tail : corner) : corner,
    paddingHorizontal: padding,
    paddingVertical: chatDensity === 'compact' ? spacing.xs + 2 : spacing.sm + 2,
  };

  const textColor = failed ? colors.onErrorContainer : onBubble;

  return (
    <View
      style={[
        styles.row,
        {
          justifyContent: isMine ? 'flex-end' : 'flex-start',
          marginTop: isGroupStart ? spacing.md : gap,
        },
      ]}
    >
      <View style={styles.column}>
        {isGroupStart ? (
          <Text
            variant="labelSmall"
            color="onSurfaceVariant"
            style={[styles.sender, isMine ? styles.senderMine : styles.senderOther]}
          >
            {senderName}
          </Text>
        ) : null}

        <PressableScale
          onPress={failed ? () => onRetry(message.id) : undefined}
          disabled={!failed}
          scaleTo={0.99}
          rippleRadius={corner}
          accessibilityRole="text"
          accessibilityLabel={`${senderName}: ${sticker ? 'sticker' : message.body}. ${format(
            new Date(message.clientCreatedAt),
            use24Hour ? 'HH:mm' : 'h:mm a',
          )}${failed ? '. Not sent' : pending ? '. Sending' : ''}`}
          style={bubbleStyle}
        >
          {sticker ? (
            <View style={styles.stickerWrap}>
              {sticker.type === 'emoji' ? (
                <Text style={styles.stickerEmoji}>{sticker.value}</Text>
              ) : (
                <StickerMedia type={sticker.type} value={sticker.value} />
              )}
            </View>
          ) : (
            <Text variant="bodyLarge" selectable style={{ color: textColor }}>
              {message.body}
            </Text>
          )}

          {isGroupEnd ? (
            <StatusRow
              message={message}
              isMine={isMine}
              color={metaColor}
              use24Hour={use24Hour}
              onRetry={onRetry}
            />
          ) : null}
        </PressableScale>

        {failed && isGroupEnd ? (
          <Text variant="labelSmall" color="error" style={styles.failedLabel}>
            Not sent · tap to retry
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  column: { maxWidth: '84%', flexShrink: 1 },
  sender: { marginBottom: 2, marginHorizontal: spacing.sm },
  senderMine: { textAlign: 'right' },
  senderOther: { textAlign: 'left' },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  checks: { flexDirection: 'row', alignItems: 'center' },
  secondCheck: { marginLeft: -8 },
  failedLabel: { marginTop: 2, marginHorizontal: spacing.sm, textAlign: 'right' },
  stickerWrap: { padding: spacing.xs },
  stickerEmoji: { fontSize: 64, lineHeight: 76 },
  stickerImage: { width: 132, height: 132, borderRadius: shape.md },
  stickerPlaceholder: { alignItems: 'center', justifyContent: 'center' },
});
