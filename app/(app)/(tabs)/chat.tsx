import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Keyboard, StyleSheet, TextInput, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { KeyboardAvoidingView, KeyboardEvents } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';

import { MessageBubble } from '../../../src/components/MessageBubble';
import { EmptyState } from '../../../src/components/EmptyState';
import { PressableScale } from '../../../src/components/PressableScale';
import { IconButton } from '../../../src/components/IconButton';
import { Text } from '../../../src/components/Text';
import { LoadingIndicator } from '../../../src/components/LoadingIndicator';
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
import { useSettings } from '../../../src/settings/SettingsProvider';
import {
  encodeStickerMessage,
  updateStickerStoragePath,
  type Sticker,
} from '../../../src/theme/stickers';
import { uploadStickerToStorage } from '../../../src/theme/stickerStorage';
import { messageDayLabel } from '../../../src/utils/date';
import { errorMessage } from '../../../src/utils/errors';
import { duration } from '../../../src/theme/motion';
import { shape, spacing } from '../../../src/theme/tokens';
import type { Message } from '../../../src/types';

interface ChatRow {
  message: Message;
  isGroupStart: boolean;
  isGroupEnd: boolean;
  showDay: boolean;
}

export default function ChatScreen() {
  const db = useSQLiteContext();
  const { colors, typography, reducedMotion } = useTheme();
  const { userId, coupleId, members } = useAuth();
  const { notifyLocalChange, syncing, refreshUnread, setChatActive } = useSync();
  const { messages, loading, loadingMore, loadOlder, retry, hasMore, addOptimisticMessage } =
    useMessages();
  const { settings } = useSettings();

  const { prefs: wallpaperPrefs } = useWallpaper();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState('');
  const [showStickers, setShowStickers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<ChatRow>>(null);
  const inputRef = useRef<TextInput>(null);
  const keyboardVisibleRef = useRef(false);
  const pendingStickersRef = useRef(false);
  const stickersDelayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seenMessageIds = useRef<Set<string>>(new Set());
  const initialPopulated = useRef(false);

  const partner = members.find((member) => member.userId !== userId);
  const myName = members.find((member) => member.userId === userId)?.displayName || 'You';
  const partnerName = partner?.displayName || 'Partner';

  const canSend = draft.trim().length > 0;
  const sendProgress = useSharedValue(canSend ? 1 : 0);

  useEffect(() => {
    sendProgress.value = withTiming(canSend ? 1 : 0, { duration: duration.short3 });
  }, [canSend, sendProgress]);

  const sendButtonStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      sendProgress.value,
      [0, 1],
      [colors.surfaceContainerHighest, colors.primary],
    ),
  }));

  useEffect(() => {
    if (messages.length > 0 && !initialPopulated.current) {
      for (const message of messages) seenMessageIds.current.add(message.id);
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

    const onShow = () => {
      keyboardVisibleRef.current = true;
      pendingStickersRef.current = false;
      clearPendingTimer();
      setShowStickers(false);
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    };

    const didHideSub = KeyboardEvents.addListener('keyboardDidHide', () => {
      keyboardVisibleRef.current = false;
      if (pendingStickersRef.current) {
        pendingStickersRef.current = false;
        clearPendingTimer();
        setShowStickers(true);
      }
    });

    const willShowSub = KeyboardEvents.addListener('keyboardWillShow', onShow);
    const didShowSub = KeyboardEvents.addListener('keyboardDidShow', onShow);

    return () => {
      willShowSub.remove();
      didShowSub.remove();
      didHideSub.remove();
      clearPendingTimer();
    };
  }, []);

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

  useEffect(() => {
    if (!coupleId || !userId) return;
    if (messages.some((message) => message.senderId !== userId && !message.readAt)) {
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
    if (stickersDelayTimerRef.current) clearTimeout(stickersDelayTimerRef.current);
    stickersDelayTimerRef.current = setTimeout(() => {
      if (pendingStickersRef.current) {
        pendingStickersRef.current = false;
        setShowStickers(true);
      }
    }, 260);
  }, [showStickers]);

  const deliver = useCallback(
    async (message: Message) => {
      addOptimisticMessage(message);
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
      try {
        await enqueueMessage(db, message);
        notifyLocalChange();
      } catch (caught) {
        setError(errorMessage(caught));
      }
    },
    [addOptimisticMessage, db, notifyLocalChange],
  );

  const send = useCallback(async () => {
    const body = draft.trim();
    if (!body || !coupleId || !userId) return;

    setDraft('');
    setError(null);
    const now = new Date().toISOString();
    await deliver({
      id: newId(),
      coupleId,
      senderId: userId,
      body,
      clientCreatedAt: now,
      serverCreatedAt: null,
      deliveredAt: null,
      readAt: null,
      updatedAt: now,
      deletedAt: null,
      syncStatus: 'pending',
      failureReason: null,
    });
  }, [coupleId, deliver, draft, userId]);

  const sendSticker = useCallback(
    async (sticker: Sticker) => {
      if (!coupleId || !userId) return;

      setError(null);
      let stickerToSend = sticker;

      // Custom stickers are uploaded on first send so the partner gets a synced object.
      if (sticker.imageUri && !sticker.storagePath && !sticker.imageUri.startsWith('http')) {
        try {
          const storagePath = await uploadStickerToStorage(coupleId, sticker.imageUri);
          stickerToSend = { ...sticker, storagePath };
          await updateStickerStoragePath(sticker.id, storagePath);
        } catch (caught) {
          setError(errorMessage(caught));
          return;
        }
      }

      const now = new Date().toISOString();
      await deliver({
        id: newId(),
        coupleId,
        senderId: userId,
        body: encodeStickerMessage(stickerToSend),
        clientCreatedAt: now,
        serverCreatedAt: null,
        deliveredAt: null,
        readAt: null,
        updatedAt: now,
        deletedAt: null,
        syncStatus: 'pending',
        failureReason: null,
      });
    },
    [coupleId, deliver, userId],
  );

  const rows = useMemo<ChatRow[]>(
    () =>
      messages.map((message, index) => {
        const previous = messages[index - 1];
        const next = messages[index + 1];
        return {
          message,
          isGroupStart: !previous || previous.senderId !== message.senderId,
          isGroupEnd: !next || next.senderId !== message.senderId,
          showDay:
            !next ||
            messageDayLabel(next.clientCreatedAt) !== messageDayLabel(message.clientCreatedAt),
        };
      }),
    [messages],
  );

  const renderItem = useCallback(
    ({ item }: { item: ChatRow }) => {
      const { message, isGroupStart, isGroupEnd, showDay } = item;
      const isMine = message.senderId === userId;
      const isNew = !seenMessageIds.current.has(message.id);
      if (isNew) seenMessageIds.current.add(message.id);

      const entering = isNew
        ? reducedMotion
          ? FadeIn.duration(duration.short3)
          : FadeInDown.duration(duration.medium1)
        : undefined;

      const body = (
        <View>
          <MessageBubble
            message={message}
            isMine={isMine}
            senderName={isMine ? myName : partnerName}
            isGroupStart={isGroupStart}
            isGroupEnd={isGroupEnd}
            onRetry={(id) => void retry(id)}
          />
          {showDay ? (
            <Text variant="labelSmall" color="onSurfaceVariant" style={styles.dayLabel}>
              {messageDayLabel(message.clientCreatedAt)}
            </Text>
          ) : null}
        </View>
      );

      return entering ? <Animated.View entering={entering}>{body}</Animated.View> : body;
    },
    [myName, partnerName, reducedMotion, retry, userId],
  );

  return (
    <WallpaperBackground prefs={wallpaperPrefs} style={styles.fill}>
      <KeyboardAvoidingView style={styles.fill} behavior="padding" keyboardVerticalOffset={0}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <View style={styles.headerText}>
            <Text variant="titleLarge" strong numberOfLines={1}>
              {partnerName}
            </Text>
            <Text variant="bodySmall" color="onSurfaceVariant">
              {syncing ? 'Syncing…' : 'Just the two of you'}
            </Text>
          </View>
          {syncing ? <LoadingIndicator size={20} /> : null}
        </View>

        {loading ? (
          <View style={styles.center}>
            <LoadingIndicator size={32} />
          </View>
        ) : messages.length === 0 ? (
          <EmptyState
            icon="chatbubble-ellipses-outline"
            title="Say something"
            description="This conversation is just the two of you. Nothing here is public."
          />
        ) : (
          <FlatList
            ref={listRef}
            data={rows}
            keyExtractor={(row) => row.message.id}
            renderItem={renderItem}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            contentContainerStyle={styles.list}
            inverted
            onEndReached={() => {
              if (hasMore) void loadOlder();
            }}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              loadingMore ? (
                <View style={styles.listFooter}>
                  <LoadingIndicator size={20} />
                </View>
              ) : null
            }
          />
        )}

        {error ? (
          <Text variant="bodySmall" color="error" style={styles.error}>
            {error}
          </Text>
        ) : null}

        <View style={styles.composer}>
          <IconButton
            icon={showStickers ? 'keypad-outline' : 'happy-outline'}
            variant={showStickers ? 'tonal' : 'standard'}
            onPress={toggleStickers}
            accessibilityLabel={showStickers ? 'Show keyboard' : 'Show stickers'}
          />

          <TextInput
            ref={inputRef}
            value={draft}
            onChangeText={setDraft}
            onFocus={() => {
              pendingStickersRef.current = false;
              setShowStickers(false);
            }}
            placeholder="Message"
            placeholderTextColor={colors.onSurfaceVariant}
            multiline
            maxLength={4000}
            accessibilityLabel="Message"
            style={[
              typography.bodyLarge,
              styles.input,
              { color: colors.onSurface, backgroundColor: colors.surfaceContainerHighest },
            ]}
          />

          <PressableScale
            onPress={send}
            disabled={!canSend}
            accessibilityRole="button"
            accessibilityLabel="Send message"
            accessibilityState={{ disabled: !canSend }}
            haptics="confirm"
            scaleTo={0.9}
            rippleRadius={shape.full}
            style={[styles.send, sendButtonStyle]}
          >
            <Ionicons name="arrow-up" size={20} color={canSend ? colors.onPrimary : colors.onSurfaceVariant} />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    gap: spacing.md,
  },
  headerText: { flex: 1 },
  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg },
  listFooter: { paddingVertical: spacing.md, alignItems: 'center' },
  dayLabel: { textAlign: 'center', marginVertical: spacing.md },
  error: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xs },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  input: {
    flex: 1,
    maxHeight: 132,
    minHeight: 48,
    borderRadius: shape.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  send: {
    width: 48,
    height: 48,
    borderRadius: shape.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
