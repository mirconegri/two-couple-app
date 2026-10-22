import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from './Screen';
import { Button } from './Button';
import { useAuth } from '../auth/AuthProvider';
import { useSync } from '../sync/SyncProvider';
import { useTheme } from '../theme/ThemeProvider';
import { enqueueNote, enqueueNoteDeletion } from '../db/notes';
import { notePastels, palette } from '../theme/tokens';
import { newId } from '../lib/id';
import { errorMessage } from '../utils/errors';
import type { Note, NoteChecklistItem, NoteKind } from '../types';

interface NoteEditorProps {
  initialNote?: Note | null;
}

export function NoteEditor({ initialNote }: NoteEditorProps) {
  const db = useSQLiteContext();
  const { colors, radii, spacing, typography } = useTheme();
  const { coupleId, userId } = useAuth();
  const { notifyLocalChange } = useSync();

  const [title, setTitle] = useState(initialNote?.title ?? '');
  const [kind, setKind] = useState<NoteKind>(initialNote?.kind ?? 'text');
  const [body, setBody] = useState(initialNote?.body ?? '');
  const [checklist, setChecklist] = useState<NoteChecklistItem[]>(
    initialNote?.checklist ?? [{ id: newId(), text: '', checked: false }],
  );
  const [selectedColor, setSelectedColor] = useState<string | null>(
    initialNote?.color ?? null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialSnapshot = useRef(
    JSON.stringify({
      title: initialNote?.title ?? '',
      kind: initialNote?.kind ?? 'text',
      body: initialNote?.body ?? '',
      checklist: initialNote?.checklist ?? [],
      color: initialNote?.color ?? null,
    }),
  );

  const itemInputRefs = useRef<{ [key: string]: TextInput | null }>({});

  const isDirty = () => {
    const current = JSON.stringify({
      title,
      kind,
      body,
      checklist,
      color: selectedColor,
    });
    return current !== initialSnapshot.current;
  };

  const handleSave = async () => {
    if (!coupleId || !userId) return;
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Give the note a title');
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const now = new Date().toISOString();
      const cleanChecklist =
        kind === 'checklist'
          ? checklist.filter((item) => item.text.trim().length > 0)
          : null;

      const note: Note = {
        id: initialNote?.id ?? newId(),
        coupleId,
        createdBy: initialNote?.createdBy ?? userId,
        title: trimmedTitle,
        kind,
        body: kind === 'text' ? body : null,
        checklist: cleanChecklist,
        color: selectedColor,
        createdAt: initialNote?.createdAt ?? now,
        updatedAt: now,
        deletedAt: null,
        syncStatus: 'pending',
      };

      await enqueueNote(db, note);
      notifyLocalChange();
      router.back();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const handleBack = () => {
    if (isDirty() && title.trim().length > 0) {
      Alert.alert(
        'Unsaved changes',
        'Do you want to save your changes before leaving?',
        [
          { text: 'Discard', style: 'destructive', onPress: () => router.back() },
          { text: 'Save', onPress: () => void handleSave() },
        ],
      );
    } else {
      router.back();
    }
  };

  const handleDelete = () => {
    if (!initialNote) return;
    Alert.alert('Delete note', 'Are you sure you want to delete this note?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await enqueueNoteDeletion(db, initialNote);
            notifyLocalChange();
            router.back();
          } catch (caught) {
            setError(errorMessage(caught));
            setBusy(false);
          }
        },
      },
    ]);
  };

  const addItem = (afterId?: string) => {
    const newItem: NoteChecklistItem = { id: newId(), text: '', checked: false };
    if (!afterId) {
      setChecklist((prev) => [...prev, newItem]);
    } else {
      setChecklist((prev) => {
        const idx = prev.findIndex((i) => i.id === afterId);
        if (idx === -1) return [...prev, newItem];
        const next = [...prev];
        next.splice(idx + 1, 0, newItem);
        return next;
      });
    }
    setTimeout(() => {
      itemInputRefs.current[newItem.id]?.focus();
    }, 50);
  };

  const updateItemText = (id: string, text: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, text } : item)),
    );
  };

  const toggleItemChecked = (id: string) => {
    let nextChecked = false;
    setChecklist((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          nextChecked = !item.checked;
          return { ...item, checked: nextChecked };
        }
        return item;
      }),
    );

    if (nextChecked) {
      setTimeout(() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setChecklist((prev) => {
          const unchecked = prev.filter((i) => !i.checked);
          const checked = prev.filter((i) => i.checked);
          return [...unchecked, ...checked];
        });
      }, 300);
    }
  };

  const removeItem = (id: string) => {
    setChecklist((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <Screen scroll>
      <View style={{ paddingTop: spacing.lg }}>
        <View style={styles.headerRow}>
          <Pressable onPress={handleBack} hitSlop={8}>
            <Text style={[typography.body, { color: colors.accent }]}>Cancel</Text>
          </Pressable>
          <Text style={[typography.heading, { color: colors.text }]}>
            {initialNote ? 'Edit note' : 'New note'}
          </Text>
          <Pressable
            onPress={handleSave}
            disabled={busy || title.trim().length === 0}
            hitSlop={8}
          >
            <Text
              style={[
                typography.bodyStrong,
                {
                  color:
                    title.trim().length === 0 ? colors.textFaint : colors.accent,
                },
              ]}
            >
              Save
            </Text>
          </Pressable>
        </View>

        {/* Color bar preview if set */}
        {selectedColor ? (
          <View
            style={[
              styles.colorBar,
              { backgroundColor: selectedColor, borderRadius: radii.sm },
            ]}
          />
        ) : null}

        {/* Title field */}
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Title"
          placeholderTextColor={colors.textFaint}
          maxLength={200}
          style={[
            typography.title,
            styles.titleInput,
            { color: colors.text, borderBottomColor: colors.border },
          ]}
        />

        {/* Segmented Control */}
        <View
          style={[
            styles.segmentContainer,
            { backgroundColor: colors.surfaceMuted, borderRadius: radii.md },
          ]}
        >
          <Pressable
            onPress={() => setKind('text')}
            style={[
              styles.segmentButton,
              kind === 'text' && {
                backgroundColor: colors.surface,
                borderRadius: radii.sm,
              },
            ]}
          >
            <Text
              style={[
                typography.caption,
                { color: kind === 'text' ? colors.text : colors.textMuted },
              ]}
            >
              Text
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setKind('checklist')}
            style={[
              styles.segmentButton,
              kind === 'checklist' && {
                backgroundColor: colors.surface,
                borderRadius: radii.sm,
              },
            ]}
          >
            <Text
              style={[
                typography.caption,
                { color: kind === 'checklist' ? colors.text : colors.textMuted },
              ]}
            >
              Checklist
            </Text>
          </Pressable>
        </View>

        {/* Text Mode */}
        {kind === 'text' ? (
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Write something…"
            placeholderTextColor={colors.textFaint}
            multiline
            style={[
              typography.body,
              styles.bodyInput,
              { color: colors.text, minHeight: 180 },
            ]}
          />
        ) : (
          /* Checklist Mode */
          <View style={{ marginTop: spacing.md }}>
            {checklist.map((item) => (
              <View key={item.id} style={styles.checkRow}>
                <Pressable
                  onPress={() => toggleItemChecked(item.id)}
                  hitSlop={8}
                  style={styles.checkboxTouch}
                >
                  <Ionicons
                    name={item.checked ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={item.checked ? colors.accent : colors.textMuted}
                  />
                </Pressable>
                <TextInput
                  ref={(ref) => {
                    itemInputRefs.current[item.id] = ref;
                  }}
                  value={item.text}
                  onChangeText={(text) => updateItemText(item.id, text)}
                  onSubmitEditing={() => addItem(item.id)}
                  placeholder="Item"
                  placeholderTextColor={colors.textFaint}
                  style={[
                    typography.body,
                    styles.itemInput,
                    {
                      color: item.checked ? colors.textMuted : colors.text,
                      textDecorationLine: item.checked ? 'line-through' : 'none',
                    },
                  ]}
                />
                <Pressable
                  onPress={() => removeItem(item.id)}
                  hitSlop={8}
                  style={styles.deleteTouch}
                >
                  <Ionicons name="close" size={18} color={colors.textFaint} />
                </Pressable>
              </View>
            ))}

            <Pressable
              onPress={() => addItem()}
              style={[styles.addItemRow, { marginTop: spacing.sm }]}
            >
              <Ionicons name="add" size={20} color={colors.accent} />
              <Text
                style={[
                  typography.body,
                  { color: colors.accent, marginLeft: spacing.sm },
                ]}
              >
                Add item
              </Text>
            </Pressable>
          </View>
        )}

        {/* Color picker row */}
        <View style={{ marginTop: spacing.xl }}>
          <Text
            style={[
              typography.caption,
              { color: colors.textMuted, marginBottom: spacing.sm },
            ]}
          >
            Color
          </Text>
          <View style={styles.swatchRow}>
            {[null, ...notePastels].map((swatch) => {
              const isSelected = selectedColor === swatch;
              return (
                <Pressable
                  key={swatch ?? 'none'}
                  onPress={() => setSelectedColor(swatch)}
                  style={[
                    styles.swatch,
                    {
                      backgroundColor: swatch ?? colors.surfaceMuted,
                      borderColor: isSelected ? colors.text : colors.border,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                >
                  {!swatch ? (
                    <Ionicons name="ban-outline" size={16} color={colors.textMuted} />
                  ) : isSelected ? (
                    <Ionicons name="checkmark" size={16} color={colors.text} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        {initialNote ? (
          <View style={{ marginTop: spacing.xxl }}>
            <Button
              label="Delete note"
              variant="danger"
              onPress={handleDelete}
              loading={busy}
            />
          </View>
        ) : null}

        {error ? (
          <Text
            style={[
              typography.caption,
              { color: colors.danger, marginTop: spacing.md },
            ]}
          >
            {error}
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  colorBar: {
    height: 4,
    width: '100%',
    marginBottom: 12,
  },
  titleInput: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
  },
  segmentContainer: {
    flexDirection: 'row',
    padding: 3,
    marginBottom: 16,
  },
  segmentButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  bodyInput: {
    textAlignVertical: 'top',
    paddingTop: 8,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkboxTouch: {
    marginRight: 10,
  },
  itemInput: {
    flex: 1,
    paddingVertical: 4,
  },
  deleteTouch: {
    padding: 4,
  },
  addItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  swatchRow: {
    flexDirection: 'row',
    gap: 12,
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
