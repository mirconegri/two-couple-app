import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { MessageBubble } from '../../../src/components/MessageBubble';
import { EmptyState } from '../../../src/components/EmptyState';
import { useAuth } from '../../../src/auth/AuthProvider';
import { useSync } from '../../../src/sync/SyncProvider';
import { useMessages } from '../../../src/hooks/useMessages';
import { enqueueMessage } from '../../../src/db/messages';
import { newId } from '../../../src/lib/id';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { messageDayLabel } from '../../../src/utils/date';
import { errorMessage } from '../../../src/utils/errors';
import type { Message } from '../../../src/types';

export default function ChatScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const { colors, spacing, typography, radii } = useTheme();
  const { userId, coupleId } = useAuth();
  const { notifyLocalChange, syncing } = useSync();
  const { messages, loading, loadingMore, loadOlder, retry, hasMore } = useMessages();

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
      },
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      },
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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

      return (
        <View>
          <MessageBubble
            message={item}
            isMine={item.senderId === userId}
            showSenderName={showSenderName}
            senderName="Them"
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
    },
    [colors.textFaint, messages, retry, spacing.md, typography.micro, userId],
  );

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.fill, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <View style={{ paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.lg }}>
        <View style={styles.headerRow}>
          <Text style={[typography.title, { color: colors.text }]}>Chat</Text>
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
            paddingBottom: keyboardVisible ? spacing.sm : Math.max(insets.bottom, spacing.sm),
            paddingHorizontal: spacing.md,
            paddingTop: spacing.sm,
          },
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

        <Pressable
          onPress={send}
          disabled={sending || draft.trim().length === 0}
          accessibilityRole="button"
          accessibilityLabel="Send message"
          style={({ pressed }) => [
            styles.sendButton,
            {
              backgroundColor:
                draft.trim().length === 0 ? colors.surfaceMuted : colors.accent,
              borderRadius: radii.pill,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Ionicons
            name="arrow-up"
            size={20}
            color={draft.trim().length === 0 ? colors.textFaint : colors.onAccent}
          />
        </Pressable>
      </View>
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
