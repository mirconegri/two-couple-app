import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSQLiteContext } from 'expo-sqlite';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { MessageBubble } from '../../../src/components/MessageBubble';
import { EmptyState } from '../../../src/components/EmptyState';
import { PressableScale } from '../../../src/components/PressableScale';
import { useAuth } from '../../../src/auth/AuthProvider';
import { useSync } from '../../../src/sync/SyncProvider';
import { useMessages } from '../../../src/hooks/useMessages';
import { enqueueMessage, markLocalMessagesRead } from '../../../src/db/messages';
import { supabaseRemote } from '../../../src/sync/remote';
import { newId } from '../../../src/lib/id';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { messageDayLabel } from '../../../src/utils/date';
import { errorMessage } from '../../../src/utils/errors';
import { duration, easing } from '../../../src/theme/motion';
import type { Message } from '../../../src/types';

function ChatLoadingShimmer() {
  const { colors, radii, spacing } = useTheme();
  const opacity = useSharedValue(0.4);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!reducedMotion) {
      opacity.value = withRepeat(
        withTiming(0.8, { duration: 800 }),
        -1,
        true,
      );
    }
  }, [reducedMotion, opacity]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={[styles.fill, { backgroundColor: colors.background, padding: spacing.lg, justifyContent: 'flex-end' }]}>
      <Animated.View
        style={[
          {
            width: '60%',
            height: 48,
            borderRadius: radii.xl,
            backgroundColor: colors.surfaceMuted,
            marginBottom: spacing.md,
            alignSelf: 'flex-start',
          },
          animStyle,
        ]}
      />
      <Animated.View
        style={[
          {
            width: '72%',
            height: 64,
            borderRadius: radii.xl,
            backgroundColor: colors.surfaceMuted,
            marginBottom: spacing.md,
            alignSelf: 'flex-end',
          },
          animStyle,
        ]}
      />
      <Animated.View
        style={[
          {
            width: '45%',
            height: 44,
            borderRadius: radii.xl,
            backgroundColor: colors.surfaceMuted,
            marginBottom: spacing.md,
            alignSelf: 'flex-start',
          },
          animStyle,
        ]}
      />
    </View>
  );
}

export default function ChatScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const { colors, spacing, typography, radii } = useTheme();
  const { userId, coupleId, members } = useAuth();
  const { notifyLocalChange, syncing } = useSync();
  const { messages, loading, loadingMore, loadOlder, retry, hasMore } = useMessages();
  const partner = members.find((m) => m.userId !== userId);

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);
  const reducedMotion = useReducedMotion();
  const seenMessageIds = useRef<Set<string>>(new Set());
  const initialPopulated = useRef(false);

  const isDraftValid = draft.trim().length > 0;
  const sendBtnProgress = useSharedValue(isDraftValid ? 1 : 0);
  const composerTranslateY = useSharedValue(0);

  useEffect(() => {
    sendBtnProgress.value = withTiming(isDraftValid ? 1 : 0, {
      duration: duration.fast,
    });
  }, [isDraftValid, sendBtnProgress]);

  const sendBtnBgStyle = useAnimatedStyle(() => {
    const bg = interpolateColor(
      sendBtnProgress.value,
      [0, 1],
      [colors.surfaceMuted, colors.accent],
    );
    return { backgroundColor: bg };
  });

  const composerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: composerTranslateY.value }],
  }));

  useEffect(() => {
    if (messages.length > 0 && !initialPopulated.current) {
      for (const m of messages) {
        seenMessageIds.current.add(m.id);
      }
      initialPopulated.current = true;
    }
  }, [messages]);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardVisible(true);
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
        if (Platform.OS === 'ios' && !reducedMotion && e?.endCoordinates?.height) {
          composerTranslateY.value = withTiming(-e.endCoordinates.height, {
            duration: 250,
            easing: easing.standard,
          });
        }
      },
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
        if (Platform.OS === 'ios' && !reducedMotion) {
          composerTranslateY.value = withTiming(0, {
            duration: 250,
            easing: easing.standard,
          });
        }
      },
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [composerTranslateY, reducedMotion]);

  // Mark incoming messages as read when viewing the chat.
  useEffect(() => {
    if (!coupleId || !userId) return;
    const hasUnread = messages.some((m) => m.senderId !== userId && !m.readAt);
    if (hasUnread) {
      void markLocalMessagesRead(db, coupleId, userId);
      void supabaseRemote.markMessagesRead();
    }
  }, [coupleId, db, messages, userId]);

  const send = useCallback(async () => {
    const body = draft.trim();
    if (!body || !coupleId || !userId) return;

    setSending(true);
    setError(null);

    try {
      const message: Message = {
        id: newId(),
        coupleId,
        senderId: userId,
        body,
        clientCreatedAt: new Date().toISOString(),
        serverCreatedAt: null,
        deliveredAt: null,
        readAt: null,
        updatedAt: new Date().toISOString(),
        deletedAt: null,
        syncStatus: 'pending',
        failureReason: null,
      };

      // Persist locally first: the message appears in the thread even if the
      // network is gone, and the outbox guarantees it is retried later.
      await enqueueMessage(db, message);
      setDraft('');
      notifyLocalChange();
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSending(false);
    }
  }, [coupleId, db, draft, notifyLocalChange, userId]);

  const renderItem = useCallback(
    ({ item, index }: { item: Message; index: number }) => {
      const next = messages[index + 1];
      const showDay =
        !next ||
        messageDayLabel(next.clientCreatedAt) !== messageDayLabel(item.clientCreatedAt);

      const showSenderName =
        !next || next.senderId !== item.senderId;

      const isMine = item.senderId === userId;
      const me = members.find((m) => m.userId === userId);
      const partner = members.find((m) => m.userId !== userId);
      const myName = me?.displayName || 'You';
      const partnerName = partner?.displayName || 'Partner';
      const senderName = isMine ? myName : partnerName;

      const isNew = !seenMessageIds.current.has(item.id);
      if (isNew) {
        seenMessageIds.current.add(item.id);
      }

      const entering = isNew
        ? reducedMotion
          ? FadeIn.duration(duration.fast)
          : FadeInDown.springify().damping(18)
        : undefined;

      const content = (
        <View>
          <MessageBubble
            message={item}
            isMine={isMine}
            showSenderName={showSenderName}
            senderName={senderName}
            onRetry={(id) => void retry(id)}
          />
          {showDay ? (
            <Text
              style={[
                typography.micro,
                {
                  color: colors.textFaint,
                  textAlign: 'center',
                  marginVertical: spacing.md,
                },
              ]}
            >
              {messageDayLabel(item.clientCreatedAt)}
            </Text>
          ) : null}
        </View>
      );

      if (entering) {
        return <Animated.View entering={entering}>{content}</Animated.View>;
      }
      return content;
    },
    [colors.textFaint, members, messages, reducedMotion, retry, spacing.md, typography.micro, userId],
  );

  if (loading) {
    return <ChatLoadingShimmer />;
  }

  return (
    <KeyboardAvoidingView
      style={[styles.fill, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? undefined : 'height'}
      keyboardVerticalOffset={0}
    >
      <View style={{ paddingTop: insets.top + spacing.xs, paddingHorizontal: spacing.lg, paddingBottom: spacing.xs }}>
        <View style={styles.headerRow}>
          <Text style={[typography.title1, { color: colors.text }]}>
            {partner?.displayName ? partner.displayName : 'Chat'}
          </Text>
          {syncing ? (
            <ActivityIndicator size="small" color={colors.textFaint} />
          ) : null}
        </View>
      </View>

      {messages.length === 0 ? (
        <EmptyState
          icon="chatbubble-ellipses-outline"
          title="Say something"
          description="This conversation is just the two of you. Nothing here is public."
        />
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.md,
            paddingBottom: spacing.lg,
          }}
          inverted
          onEndReached={() => {
            if (hasMore) void loadOlder();
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator
                style={{ marginVertical: spacing.md }}
                color={colors.textFaint}
              />
            ) : null
          }
        />
      )}

      {error ? (
        <Text
          style={[
            typography.caption,
            { color: colors.danger, paddingHorizontal: spacing.lg, paddingBottom: spacing.xs },
          ]}
        >
          {error}
        </Text>
      ) : null}

      <Animated.View
        style={[
          styles.composer,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: keyboardVisible ? spacing.sm : Math.max(insets.bottom, spacing.sm),
            paddingHorizontal: spacing.md,
            paddingTop: spacing.sm,
          },
          Platform.OS === 'ios' ? composerAnimatedStyle : undefined,
        ]}
      >
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Message"
          placeholderTextColor={colors.textFaint}
          multiline
          maxLength={4000}
          style={[
            typography.body,
            styles.input,
            {
              color: colors.text,
              backgroundColor: colors.surfaceMuted,
              borderRadius: radii.lg,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm + 2,
            },
          ]}
        />

        <PressableScale
          onPress={send}
          disabled={sending || draft.trim().length === 0}
          accessibilityRole="button"
          accessibilityLabel="Send message"
          haptics="light"
          scaleTo={0.92}
          style={[
            styles.sendButton,
            {
              borderRadius: radii.pill,
            },
            sendBtnBgStyle,
          ]}
        >
          <Ionicons
            name="arrow-up"
            size={20}
            color={draft.trim().length === 0 ? colors.textFaint : colors.onAccent}
          />
        </PressableScale>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: { flex: 1, maxHeight: 120, minHeight: 40 },
  sendButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});
