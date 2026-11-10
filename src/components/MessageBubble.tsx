import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { Message } from '../types';
import { useTheme } from '../theme/ThemeProvider';
import { parseStickerMessage } from '../theme/stickers';
import {
  getCachedSignedStickerUrl,
  getSignedStickerUrl,
  invalidateSignedStickerUrl,
} from '../theme/stickerStorage';
import { PressableScale } from './PressableScale';
import { spring } from '../theme/motion';

function StickerMedia({ type, value }: { type: 'image' | 'storage'; value: string }) {
  const { colors, typography } = useTheme();
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
      <View style={[styles.stickerImage, styles.stickerPlaceholder, { backgroundColor: colors.surfaceMuted }]}>
        <ActivityIndicator size="small" color={colors.textFaint} />
      </View>
    );
  }

  if (failed || !uri) {
    return (
      <PressableScale
        onPress={
          type === 'storage'
            ? () => {
                void invalidateSignedStickerUrl(value).then(() => setRetryCount((c) => c + 1));
              }
            : undefined
        }
        disabled={type !== 'storage'}
        style={[styles.stickerImage, styles.stickerPlaceholder, { backgroundColor: colors.surfaceMuted }]}
      >
        <Ionicons
          name={type === 'storage' ? 'refresh-outline' : 'image-outline'}
          size={26}
          color={colors.textFaint}
        />
        <Text style={[typography.micro, { color: colors.textFaint, marginTop: 4 }]}>Sticker</Text>
      </PressableScale>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={styles.stickerImage}
      resizeMode="contain"
      onError={() => {
        if (type === 'storage') {
          void invalidateSignedStickerUrl(value);
        }
        setFailed(true);
      }}
    />
  );
}

interface MessageBubbleProps {
  message: Message;
  isMine: boolean;
  showSenderName: boolean;
  senderName: string;
  onRetry: (id: string) => void;
}

function PendingClock() {
  const opacity = useSharedValue(1);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!reducedMotion) {
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    }
    return () => cancelAnimation(opacity);
  }, [opacity, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[{ marginLeft: 4 }, animatedStyle]}>
      <Ionicons name="time-outline" size={11} color="rgba(255,255,255,0.7)" />
    </Animated.View>
  );
}

function ReceiptChecks({
  readAt,
  deliveredAt,
}: {
  readAt: string | null;
  deliveredAt: string | null;
}) {
  const isRead = Boolean(readAt);
  const isDelivered = Boolean(deliveredAt);
  const wasDeliveredRef = useRef(isDelivered && !isRead);
  const scale = useSharedValue(1);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (isRead && wasDeliveredRef.current && !reducedMotion) {
      scale.value = withSequence(
        withSpring(1.2, spring.pop),
        withSpring(1, spring.pop),
      );
      wasDeliveredRef.current = false;
    }
  }, [isRead, reducedMotion, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (isRead) {
    return (
      <Animated.View style={[styles.checksRow, animStyle]}>
        <Ionicons name="checkmark" size={13} color="#53BDEB" />
        <Ionicons name="checkmark" size={13} color="#53BDEB" style={{ marginLeft: -8 }} />
      </Animated.View>
    );
  }

  if (isDelivered) {
    return (
      <View style={styles.checksRow}>
        <Ionicons name="checkmark" size={13} color="rgba(255,255,255,0.7)" />
        <Ionicons name="checkmark" size={13} color="rgba(255,255,255,0.7)" style={{ marginLeft: -8 }} />
      </View>
    );
  }

  return (
    <Ionicons
      name="checkmark"
      size={13}
      color="rgba(255,255,255,0.7)"
      style={{ marginLeft: 4 }}
    />
  );
}

export function MessageBubble({
  message,
  isMine,
  showSenderName,
  senderName,
  onRetry,
}: MessageBubbleProps) {
  const { colors, radii, spacing, typography } = useTheme();

  const background = isMine ? colors.bubbleSelf : colors.bubbleOther;
  const textColor = isMine ? colors.bubbleSelfText : colors.bubbleOtherText;
  const time = format(new Date(message.clientCreatedAt), 'HH:mm');

  const failed = message.syncStatus === 'failed';
  const pending = message.syncStatus === 'pending';
  const stickerData = parseStickerMessage(message.body);

  if (stickerData) {
    return (
      <View
        style={[
          styles.row,
          { justifyContent: isMine ? 'flex-end' : 'flex-start' },
          { marginBottom: spacing.md },
        ]}
      >
        <View style={{ alignItems: isMine ? 'flex-end' : 'flex-start' }}>
          {showSenderName ? (
            <Text
              style={[
                typography.micro,
                {
                  color: colors.textMuted,
                  marginBottom: 2,
                  marginLeft: isMine ? 0 : spacing.xs,
                  marginRight: isMine ? spacing.xs : 0,
                  textAlign: isMine ? 'right' : 'left',
                },
              ]}
            >
              {senderName}
            </Text>
          ) : null}

          <View style={styles.stickerContainer}>
            {stickerData.type === 'emoji' ? (
              <Text style={styles.stickerEmoji}>{stickerData.value}</Text>
            ) : (
              <StickerMedia type={stickerData.type} value={stickerData.value} />
            )}

            <View style={styles.stickerMetaPill}>
              <Text style={[typography.caption2, { color: '#FFFFFF', fontSize: 10 }]}>{time}</Text>
              {isMine && pending ? <PendingClock /> : null}
              {isMine && failed ? (
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel="Retry sending"
                  onPress={() => onRetry(message.id)}
                  hitSlop={8}
                  scaleTo={0.9}
                  style={{ marginLeft: spacing.xs }}
                >
                  <Ionicons name="alert-circle" size={12} color={colors.danger} />
                </PressableScale>
              ) : null}
              {isMine && !pending && !failed ? (
                <ReceiptChecks readAt={message.readAt} deliveredAt={message.deliveredAt} />
              ) : null}
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.row,
        { justifyContent: isMine ? 'flex-end' : 'flex-start' },
        { marginBottom: spacing.sm },
      ]}
    >
      <View style={{ maxWidth: '82%' }}>
        {showSenderName ? (
          <Text
            style={[
              typography.micro,
              {
                color: colors.textMuted,
                marginBottom: 2,
                marginLeft: isMine ? 0 : spacing.xs,
                marginRight: isMine ? spacing.xs : 0,
                textAlign: isMine ? 'right' : 'left',
              },
            ]}
          >
            {senderName}
          </Text>
        ) : null}

        <View
          style={[
            styles.bubble,
            {
              backgroundColor: background,
              borderRadius: radii.xl,
              paddingHorizontal: spacing.md + 2,
              paddingVertical: spacing.sm + 1,
              borderWidth: 0,
              borderBottomRightRadius: isMine ? radii.xs : radii.xl,
              borderBottomLeftRadius: isMine ? radii.xl : radii.xs,
            },
          ]}
        >
          <Text style={[typography.body, { color: textColor }]}>{message.body}</Text>

          <View style={[styles.metaRow, { marginTop: spacing.xxs }]}>
            <Text
              style={[
                typography.caption2,
                {
                  color: isMine ? 'rgba(255,255,255,0.7)' : colors.textFaint,
                },
              ]}
            >
              {time}
            </Text>

            {isMine && pending ? <PendingClock /> : null}

            {isMine && failed ? (
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel="Retry sending"
                onPress={() => onRetry(message.id)}
                hitSlop={8}
                scaleTo={0.9}
                style={{ marginLeft: spacing.xs }}
              >
                <Ionicons name="alert-circle" size={12} color={colors.danger} />
              </PressableScale>
            ) : null}

            {isMine && !pending && !failed ? (
              <ReceiptChecks readAt={message.readAt} deliveredAt={message.deliveredAt} />
            ) : null}
          </View>
        </View>

        {failed ? (
          <PressableScale
            onPress={() => onRetry(message.id)}
            hitSlop={8}
            scaleTo={0.96}
          >
            <Text
              style={[
                typography.micro,
                { color: colors.danger, marginTop: 2, textAlign: 'right' },
              ]}
            >
              Not sent · tap to retry
            </Text>
          </PressableScale>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  bubble: { flexShrink: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end' },
  checksRow: { flexDirection: 'row', alignItems: 'center' },
  stickerContainer: {
    position: 'relative',
    padding: 4,
  },
  stickerEmoji: {
    fontSize: 72,
    lineHeight: 84,
  },
  stickerImage: {
    width: 130,
    height: 130,
    borderRadius: 12,
  },
  stickerPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickerMetaPill: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
});
