import React from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { Screen } from '../../../src/components/Screen';
import { EmptyState } from '../../../src/components/EmptyState';
import { Button } from '../../../src/components/Button';
import { NavBarButton } from '../../../src/components/NavBarButton';
import { PressableScale } from '../../../src/components/PressableScale';
import { useNotes } from '../../../src/hooks/useNotes';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { useSync } from '../../../src/sync/SyncProvider';
import { enqueueNoteDeletion } from '../../../src/db/notes';
import type { Note } from '../../../src/types';

export default function NotesScreen() {
  const db = useSQLiteContext();
  const { colors, spacing, typography, radii } = useTheme();
  const { notes, loading, reload } = useNotes();
  const { notifyLocalChange } = useSync();
  const reducedMotion = useReducedMotion();

  const handleDelete = (note: Note) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
    Alert.alert('Delete note', `Delete "${note.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await enqueueNoteDeletion(db, note);
          notifyLocalChange();
          void reload();
        },
      },
    ]);
  };

  const renderNoteCard = ({ item, index }: { item: Note; index: number }) => {
    const checklistPreview = item.checklist?.slice(0, 3) ?? [];
    const remainingCount = (item.checklist?.length ?? 0) - checklistPreview.length;

    return (
      <Animated.View
        entering={
          reducedMotion
            ? FadeIn.duration(150)
            : FadeIn.duration(200).delay(index * 30)
        }
        style={{ flex: 1 }}
      >
        <PressableScale
          onPress={() => router.push(`/(app)/note/${item.id}`)}
          onLongPress={() => handleDelete(item)}
          scaleTo={0.97}
          haptics="selection"
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: item.color ?? colors.border,
              borderRadius: radii.md,
              padding: spacing.md,
            },
          ]}
        >
          {item.color ? (
            <View
              style={[
                styles.colorStrip,
                {
                  backgroundColor: item.color,
                  marginHorizontal: -spacing.md,
                  marginTop: -spacing.md,
                  marginBottom: spacing.sm,
                },
              ]}
            />
          ) : null}

          <Text
            style={[typography.heading, { color: colors.text, marginBottom: spacing.xs }]}
            numberOfLines={2}
          >
            {item.title}
          </Text>

          {item.kind === 'text' ? (
            <Text
              style={[typography.caption, { color: colors.textMuted }]}
              numberOfLines={3}
            >
              {item.body || 'Empty note'}
            </Text>
          ) : (
            <View style={{ marginTop: spacing.xxs }}>
              {checklistPreview.map((check) => (
                <View key={check.id} style={styles.checkItemRow}>
                  <Ionicons
                    name={check.checked ? 'checkbox' : 'square-outline'}
                    size={14}
                    color={check.checked ? colors.textFaint : colors.textMuted}
                    style={{ marginRight: spacing.xs }}
                  />
                  <Text
                    style={[
                      typography.caption,
                      {
                        color: check.checked ? colors.textFaint : colors.textMuted,
                        textDecorationLine: check.checked ? 'line-through' : 'none',
                        flex: 1,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {check.text || 'Empty item'}
                  </Text>
                </View>
              ))}
              {remainingCount > 0 ? (
                <Text
                  style={[
                    typography.micro,
                    { color: colors.textFaint, marginTop: spacing.xxs },
                  ]}
                >
                  +{remainingCount} more
                </Text>
              ) : null}
            </View>
          )}
        </PressableScale>
      </Animated.View>
    );
  };

  return (
    <Screen scroll={false}>
      <View style={[styles.headerRow, { paddingTop: spacing.md, paddingBottom: spacing.sm }]}>
        <Text style={[typography.largeTitle, { color: colors.text }]}>Notes</Text>
        <NavBarButton
          icon="create-outline"
          onPress={() => router.push('/(app)/note/new')}
        />
      </View>

      <FlatList
        data={notes}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ gap: spacing.md }}
        contentContainerStyle={[
          styles.listContent,
          { gap: spacing.md, paddingBottom: spacing.xxxl },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={reload}
            tintColor={colors.accent}
          />
        }
        renderItem={renderNoteCard}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="document-text-outline"
              title="No notes yet"
              description="Keep shared thoughts, lists, and ideas in one place."
              action={
                <Button
                  label="Create note"
                  onPress={() => router.push('/(app)/note/new')}
                />
              }
            />
          ) : null
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    flexGrow: 1,
  },
  card: {
    flex: 1,
    borderWidth: 1,
    minHeight: 110,
    overflow: 'hidden',
  },
  colorStrip: {
    height: 4,
  },
  checkItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
});
