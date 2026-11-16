import React from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Screen } from '../../../src/components/Screen';
import { EmptyState } from '../../../src/components/EmptyState';
import { Button } from '../../../src/components/Button';
import { Text } from '../../../src/components/Text';
import { TopAppBar } from '../../../src/components/TopAppBar';
import { Fab } from '../../../src/components/Fab';
import { PressableScale } from '../../../src/components/PressableScale';
import { useNotes } from '../../../src/hooks/useNotes';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { useSync } from '../../../src/sync/SyncProvider';
import { useHaptics } from '../../../src/lib/haptics';
import { enqueueNoteDeletion } from '../../../src/db/notes';
import { duration } from '../../../src/theme/motion';
import { shape, spacing } from '../../../src/theme/tokens';
import type { Note } from '../../../src/types';

export default function NotesScreen() {
  const db = useSQLiteContext();
  const { colors, reducedMotion } = useTheme();
  const { notes, loading, reload } = useNotes();
  const { notifyLocalChange } = useSync();
  const haptics = useHaptics();

  const handleDelete = (note: Note) => {
    haptics.longPress();
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
        entering={FadeIn.duration(duration.short4).delay(
          reducedMotion ? 0 : Math.min(index, 8) * 30,
        )}
        style={styles.cell}
      >
        <PressableScale
          onPress={() => router.push(`/(app)/note/${item.id}`)}
          onLongPress={() => handleDelete(item)}
          scaleTo={0.97}
          haptics="selection"
          rippleRadius={shape.lg}
          accessibilityRole="button"
          accessibilityLabel={item.title}
          style={[styles.card, { backgroundColor: colors.surfaceContainerLow }]}
        >
          {item.color ? (
            <View
              style={[
                styles.strip,
                { backgroundColor: item.color, marginHorizontal: -spacing.lg },
              ]}
            />
          ) : null}

          <Text variant="titleMedium" strong numberOfLines={2}>
            {item.title}
          </Text>

          {item.kind === 'text' ? (
            <Text variant="bodySmall" color="onSurfaceVariant" numberOfLines={3}>
              {item.body || 'Empty note'}
            </Text>
          ) : (
            <View style={styles.checklist}>
              {checklistPreview.map((check) => (
                <View key={check.id} style={styles.checkRow}>
                  <Ionicons
                    name={check.checked ? 'checkbox' : 'square-outline'}
                    size={14}
                    color={check.checked ? colors.outline : colors.onSurfaceVariant}
                  />
                  <Text
                    variant="bodySmall"
                    numberOfLines={1}
                    style={[
                      styles.checkText,
                      {
                        color: check.checked ? colors.outline : colors.onSurfaceVariant,
                        textDecorationLine: check.checked ? 'line-through' : 'none',
                      },
                    ]}
                  >
                    {check.text || 'Empty item'}
                  </Text>
                </View>
              ))}
              {remainingCount > 0 ? (
                <Text variant="labelSmall" color="onSurfaceVariant">
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
    <View style={styles.root}>
      <TopAppBar title="Notes" />

      <Screen scroll={false} contentStyle={styles.content}>
        <FlatList
          data={notes}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.column}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.primary} />
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
                    icon="add"
                    onPress={() => router.push('/(app)/note/new')}
                  />
                }
              />
            ) : null
          }
        />
      </Screen>

      <Fab
        icon="add"
        label="Note"
        onPress={() => router.push('/(app)/note/new')}
        accessibilityLabel="New note"
        style={styles.fab}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingTop: spacing.md },
  column: { gap: spacing.md },
  list: { gap: spacing.md, paddingBottom: 96, flexGrow: 1 },
  cell: { flex: 1 },
  card: {
    flex: 1,
    minHeight: 120,
    borderRadius: shape.lg,
    padding: spacing.lg,
    gap: spacing.xs,
    overflow: 'hidden',
  },
  strip: { height: 4, marginTop: -spacing.lg, marginBottom: spacing.sm, borderRadius: shape.full },
  checklist: { gap: 2, marginTop: spacing.xs },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  checkText: { flex: 1 },
  fab: { position: 'absolute', right: spacing.lg, bottom: spacing.lg },
});
