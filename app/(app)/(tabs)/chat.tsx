import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
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
import { KeyboardAvoidingView, KeyboardEvents } from 'react-native-keyboard-controller';
import { useSQLiteContext } from 'expo-sqlite';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { MessageBubble } from '../../../src/components/MessageBubble';
import { EmptyState } from '../../../src/components/EmptyState';
import { PressableScale } from '../../../src/components/PressableScale';
import { WallpaperBackground } from '../../../src/components/WallpaperBackground';
import { StickerPicker } from '../../../src/components/StickerPicker';
import { useAuth } from '../../../src/auth/AuthProvider';
import { useSync } from '../../../src/sync/SyncProvider';
import { useMessages } from '../../../src/hooks/useMessages';
import { enqueueMessage, markLocalMessagesRead } from '../../../src/db/messages';
import { supabaseRemote } from '../../../src/sync/remote';
import { newId } from '../../../src/lib/id';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { useWallpaper } from '../../../src/theme/WallpaperProvider';
import {
  encodeStickerMessage,
  updateStickerStoragePath,
  type Sticker,
} from '../../../src/theme/stickers';
import { uploadStickerToStorage } from '../../../src/theme/stickerStorage';
import { messageDayLabel } from '../../../src/utils/date';
import { errorMessage } from '../../../src/utils/errors';
import { duration } from '../../../src/theme/motion';
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
  const { notifyLocalChange, syncing, refreshUnread, setChatActive } = useSync();
  const { messages, loading, loadingMore, loadOlder, retry, hasMore, addOptimisticMessage } =
    useMessages();
  const partner = members.find((m) => m.userId !== userId);

  const { prefs: wallpaperPrefs } = useWallpaper();
  const [draft, setDraft] = useState('');
  const [showStickers, setShowStickers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<Message>>(null);
  const inputRef = useRef<TextInput>(null);
  const keyboardVisibleRef = useRef(false);
  const pendingStickersRef = useRef(false);
  const stickersDelayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reducedMotion = useReducedMotion();
  const seenMessageIds = useRef<Set<string>>(new Set());
  const initialPopulated = useRef(false);

  const isDraftValid = draft.trim().length > 0;
  const sendBtnProgress = useSharedValue(isDraftValid ? 1 : 0);

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

  useEffect(() => {
    if (messages.length > 0 && !initialPopulated.current) {
      for (const m of messages) {
        seenMessageIds.current.add(m.id);
      }
      initialPopulated.current = true;
    }
  }, [messages]);

  useEffect(() => {
    const clearPendingTimer = () => {
      if (stickersDelayTimerRef.current) {
        clearTimeout(stickersDelayTimerRef.current);
        stickersDelayTimerRef.current = null;
      }
    };

    const willShowSub = KeyboardEvents.addListener('keyboardWillShow', () => {
      keyboardVisibleRef.current = true;
      pendingStickersRef.current = false;
      clearPendingTimer();
      setShowStickers(false);
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    });

    const didShowSub = KeyboardEvents.addListener('keyboardDidShow', () => {
      keyboardVisibleRef.current = true;
      pendingStickersRef.current = false;
      clearPendingTimer();
      setShowStickers(false);
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    });

    const didHideSub = KeyboardEvents.addListener('keyboardDidHide', () => {
      keyboardVisibleRef.current = false;
      if (pendingStickersRef.current) {
        pendingStickersRef.current = false;
        clearPendingTimer();
        setShowStickers(true);
      }
    });

    return () => {
      willShowSub.remove();
      didShowSub.remove();
      didHideSub.remove();
      clearPendingTimer();
    };
  }, []);

  // Notify sync provider when chat screen is active to manage notifications
  useEffect(() => {
    setChatActive(true);
    if (coupleId && userId) {
      void (async () => {
        await markLocalMessagesRead(db, coupleId, userId);
        await refreshUnread();
      })();
    }
    return () => {
      setChatActive(false);
    };
  }, [coupleId, db, refreshUnread, setChatActive, userId]);

  // Mark incoming messages as read when viewing the chat.
  useEffect(() => {
    if (!coupleId || !userId) return;
    const hasUnread = messages.some((m) => m.senderId !== userId && !m.readAt);
    if (hasUnread) {
      void (async () => {
        await markLocalMessagesRead(db, coupleId, userId);
        await refreshUnread();
        void supabaseRemote.markMessagesRead();
      })();
    }
  }, [coupleId, db, messages, refreshUnread, userId]);

  const toggleStickers = useCallback(() => {
    if (showStickers) {
      pendingStickersRef.current = false;
      setShowStickers(false);
      requestAnimationFrame(() => inputRef.current?.focus());
      return;
    }

    if (!keyboardVisibleRef.current) {
      setShowStickers(true);
      return;
    }

    pendingStickersRef.current = true;
    inputRef.current?.blur();
    Keyboard.dismiss();
    if (stickersDelayTimerRef.current) {
      clearTimeout(stickersDelayTimerRef.current);
    }
    stickersDelayTimerRef.current = setTimeout(() => {
      if (pendingStickersRef.current) {
        pendingStickersRef.current = false;
        setShowStickers(true);
      }
    }, 260);
  }, [showStickers]);

  const send = useCallback(async () => {
    const body = draft.trim();
    if (!body || !coupleId || !userId) return;

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

    // Instant optimistic feedback: clear input, show bubble, scroll to latest
    setDraft('');
    setError(null);
    addOptimisticMessage(message);
    listRef.current?.scrollToOffset({ offset: 0, animated: true });

    try {
      await enqueueMessage(db, message);
      notifyLocalChange();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }, [addOptimisticMessage, coupleId, db, draft, notifyLocalChange, userId]);

  const sendSticker = useCallback(
    async (sticker: Sticker) => {
      if (!coupleId || !userId) return;

      setError(null);
      let stickerToSend = sticker;

      // Upload local-only custom stickers lazily so the partner receives a synced storage object.
      if (
        sticker.imageUri &&
        !sticker.storagePath &&
        !sticker.imageUri.startsWith('http')
      ) {
        try {
          const storagePath = await uploadStickerToStorage(coupleId, sticker.imageUri);
          stickerToSend = { ...sticker, storagePath };
          await updateStickerStoragePath(sticker.id, storagePath);
        } catch (caught) {
          setError(errorMessage(caught));
          return;
        }
      }

      const body = encodeStickerMessage(stickerToSend);
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

      addOptimisticMessage(message);
      listRef.current?.scrollToOffset({ offset: 0, animated: true });

      try {
        await enqueueMessage(db, message);
        notifyLocalChange();
      } catch (caught) {
        setError(errorMessage(caught));
      }
    },
    [addOptimisticMessage, coupleId, db, notifyLocalChange, userId],
  );

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
      const partnerMember = members.find((m) => m.userId !== userId);
      const myName = me?.displayName || 'You';
      const partnerName = partnerMember?.displayName || 'Partner';
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
    <WallpaperBackground prefs={wallpaperPrefs} style={styles.fill}>
      <KeyboardAvoidingView
        style={[
          styles.fill,
          { backgroundColor: wallpaperPrefs.id === 'default' ? colors.background : 'transparent' },
        ]}
        behavior="padding"
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

        <View
          style={[
            styles.composer,
            {
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
              paddingBottom: spacing.sm,
              paddingHorizontal: spacing.md,
              paddingTop: spacing.sm,
            },
          ]}
        >
          <PressableScale
            onPress={toggleStickers}
            hitSlop={8}
            scaleTo={0.92}
            accessibilityRole="button"
            accessibilityLabel={showStickers ? 'Keyboard' : 'Stickers'}
            style={styles.iconButton}
          >
            <Ionicons
              name={showStickers ? 'keypad-outline' : 'happy-outline'}
              size={24}
              color={showStickers ? colors.accent : colors.textFaint}
            />
          </PressableScale>

          <TextInput
            ref={inputRef}
            value={draft}
            onChangeText={setDraft}
            onFocus={() => {
              pendingStickersRef.current = false;
              setShowStickers(false);
            }}
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
            disabled={draft.trim().length === 0}
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
        </View>

        {showStickers ? (
          <StickerPicker
            onSelect={(sticker) => void sendSticker(sticker)}
            onClose={() => setShowStickers(false)}
          />
        ) : null}
      </KeyboardAvoidingView>
    </WallpaperBackground>
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
  iconButton: {
    width: 38,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  sendButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});
