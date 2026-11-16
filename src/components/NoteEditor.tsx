import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  LinearTransition,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from './Screen';
import { Button } from './Button';
import { NavBarButton } from './NavBarButton';
import { SegmentedControl } from './SegmentedControl';
import { PressableScale } from './PressableScale';
import { useAuth } from '../auth/AuthProvider';
import { useSync } from '../sync/SyncProvider';
import { useTheme } from '../theme/ThemeProvider';
import { enqueueNote, enqueueNoteDeletion } from '../db/notes';
import { noteColors } from '../theme/tokens';
import { newId } from '../lib/id';
import { errorMessage } from '../utils/errors';
import { spring } from '../theme/motion';
import type { Note, NoteChecklistItem, NoteKind } from '../types';

interface NoteEditorProps {
  initialNote?: Note | null;
}

function CheckItemCheckbox({
  checked,
  color,
  onPress,
}: {
  checked: boolean;
  color: string;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const reducedMotion = useReducedMotion();

  const handlePress = () => {
    if (!reducedMotion) {
      scale.value = withSequence(
        withSpring(1.15, spring.spatialFast),
        withSpring(1, spring.spatialFast),
      );
    }
    void Haptics.selectionAsync();
    onPress();
  };

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable onPress={handlePress} hitSlop={8} style={styles.checkboxTouch}>
      <Animated.View style={animStyle}>
        <Ionicons
          name={checked ? 'checkbox' : 'square-outline'}
          size={22}
          color={color}
        />
      </Animated.View>
    </Pressable>
  );
}

export function NoteEditor({ initialNote }: NoteEditorProps) {
  const db = useSQLiteContext();
  const { colors, shape, spacing, typography } = useTheme();
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
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
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
    setChecklist((prev) => {
      const updated = prev.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item,
      );
      const unchecked = updated.filter((i) => !i.checked);
      const checked = updated.filter((i) => i.checked);
      return [...unchecked, ...checked];
    });
  };

  const removeItem = (id: string) => {
    setChecklist((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <Screen scroll>
      <View style={{ paddingTop: spacing.lg }}>
        <View style={styles.headerRow}>
          <NavBarButton label="Cancel" onPress={handleBack} />
          <Text style={[typography.titleMedium, { color: colors.onSurface }]}>
            {initialNote ? 'Edit note' : 'New note'}
          </Text>
          <NavBarButton
            label="Save"
            bold
            onPress={handleSave}
            disabled={busy || title.trim().length === 0}
          />
        </View>

        {/* Color bar preview if set */}
        {selectedColor ? (
          <View
            style={[
              styles.colorBar,
              { backgroundColor: selectedColor, borderRadius: shape.sm },
            ]}
          />
        ) : null}

        {/* Title field */}
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Title"
          placeholderTextColor={colors.outline}
          maxLength={200}
          style={[
            typography.displaySmall,
            styles.titleInput,
            { color: colors.onSurface, borderBottomColor: colors.outlineVariant },
          ]}
        />

        {/* Segmented Control */}
        <SegmentedControl
          options={[
            { value: 'text', label: 'Text' },
            { value: 'checklist', label: 'Checklist' },
          ]}
          value={kind}
          onChange={setKind}
          style={{ marginBottom: spacing.lg }}
        />

        {/* Text Mode */}
        {kind === 'text' ? (
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Write something…"
            placeholderTextColor={colors.outline}
            multiline
            style={[
              typography.bodyLarge,
              styles.bodyInput,
              { color: colors.onSurface, minHeight: 180 },
            ]}
          />
        ) : (
          /* Checklist Mode */
          <View style={{ marginTop: spacing.md }}>
            {checklist.map((item) => (
              <Animated.View
                key={item.id}
                layout={LinearTransition.springify().damping(spring.spatialDefault.damping).stiffness(spring.spatialDefault.stiffness)}
                style={styles.checkRow}
              >
                <CheckItemCheckbox
                  checked={item.checked}
                  color={item.checked ? colors.primary : colors.onSurfaceVariant}
                  onPress={() => toggleItemChecked(item.id)}
                />
                <TextInput
                  ref={(ref) => {
                    itemInputRefs.current[item.id] = ref;
                  }}
                  value={item.text}
                  onChangeText={(text) => updateItemText(item.id, text)}
                  onSubmitEditing={() => addItem(item.id)}
                  placeholder="Item"
                  placeholderTextColor={colors.outline}
                  style={[
                    typography.bodyLarge,
                    styles.itemInput,
                    {
                      color: item.checked ? colors.onSurfaceVariant : colors.onSurface,
                      textDecorationLine: item.checked ? 'line-through' : 'none',
                    },
                  ]}
                />
                <Pressable
                  onPress={() => removeItem(item.id)}
                  hitSlop={8}
                  style={styles.deleteTouch}
                >
                  <Ionicons name="close" size={18} color={colors.outline} />
                </Pressable>
              </Animated.View>
            ))}

            <PressableScale
              onPress={() => addItem()}
              haptics="selection"
              scaleTo={0.96}
              style={[styles.addItemRow, { marginTop: spacing.sm }]}
            >
              <Ionicons name="add" size={20} color={colors.primary} />
              <Text
                style={[
                  typography.bodyLarge,
                  { color: colors.primary, marginLeft: spacing.sm },
                ]}
              >
                Add item
              </Text>
            </PressableScale>
          </View>
        )}

        {/* Color picker row */}
        <View style={{ marginTop: spacing.xl }}>
          <Text
            style={[
              typography.bodySmall,
              { color: colors.onSurfaceVariant, marginBottom: spacing.sm },
            ]}
          >
            Color
          </Text>
          <View style={styles.swatchRow}>
            {[null, ...noteColors].map((swatch) => {
              const isSelected = selectedColor === swatch;
              return (
                <PressableScale
                  key={swatch ?? 'none'}
                  onPress={() => setSelectedColor(swatch)}
                  haptics="selection"
                  scaleTo={0.9}
                  style={[
                    styles.swatch,
                    {
                      backgroundColor: swatch ?? colors.surfaceContainerHigh,
                      borderColor: isSelected ? colors.onSurface : colors.outlineVariant,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                >
                  {!swatch ? (
                    <Ionicons name="ban-outline" size={16} color={colors.onSurfaceVariant} />
                  ) : isSelected ? (
                    <Ionicons name="checkmark" size={16} color={colors.onSurface} />
                  ) : null}
                </PressableScale>
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
              typography.bodySmall,
              { color: colors.error, marginTop: spacing.md },
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
