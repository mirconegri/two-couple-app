import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

import type { Message } from '../types';
import { useTheme } from '../theme/ThemeProvider';

interface MessageBubbleProps {
  message: Message;
  isMine: boolean;
  showSenderName: boolean;
  senderName: string;
  onRetry: (id: string) => void;
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

            {isMine && pending ? (
              <Ionicons
                name="time-outline"
                size={11}
                color="rgba(255,255,255,0.7)"
                style={{ marginLeft: spacing.xs }}
              />
            ) : null}

            {isMine && failed ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Retry sending"
                onPress={() => onRetry(message.id)}
                hitSlop={8}
                style={{ marginLeft: spacing.xs }}
              >
                <Ionicons name="alert-circle" size={12} color={colors.danger} />
              </Pressable>
            ) : null}

            {isMine && !pending && !failed ? (
              <Ionicons
                name="checkmark"
                size={12}
                color="rgba(255,255,255,0.72)"
                style={{ marginLeft: spacing.xs }}
              />
            ) : null}
          </View>
        </View>

        {failed ? (
          <Pressable onPress={() => onRetry(message.id)} hitSlop={8}>
            <Text
              style={[
                typography.micro,
                { color: colors.danger, marginTop: 2, textAlign: 'right' },
              ]}
            >
              Not sent · tap to retry
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  bubble: { flexShrink: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end' },
});
