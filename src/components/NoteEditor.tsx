import React, { useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from './Screen';
import { Button } from './Button';
import { Chip } from './Chip';
import { Text } from './Text';
import { TopAppBar } from './TopAppBar';
import { IconButton } from './IconButton';
import { SegmentedButton } from './SegmentedButton';
import { PressableScale } from './PressableScale';
import { useAuth } from '../auth/AuthProvider';
import { useSync } from '../sync/SyncProvider';
import { useTheme } from '../theme/ThemeProvider';
import { useHaptics } from '../lib/haptics';
import { enqueueNote, enqueueNoteDeletion } from '../db/notes';
import { noteColors, shape, spacing } from '../theme/tokens';
import { spring } from '../theme/motion';
import { newId } from '../lib/id';
import { errorMessage } from '../utils/errors';
import type { Note, NoteChecklistItem, NoteKind } from '../types';

interface NoteEditorProps {
  initialNote?: Note | null;
}

export function NoteEditor({ initialNote }: NoteEditorProps) {
  const db = useSQLiteContext();
  const { colors, reducedMotion, typography } = useTheme();
  const { coupleId, userId } = useAuth();
  const { notifyLocalChange } = useSync();
  const haptics = useHaptics();

  const [title, setTitle] = useState(initialNote?.title ?? '');
  const [kind, setKind] = useState<NoteKind>(initialNote?.kind ?? 'text');
  const [body, setBody] = useState(initialNote?.body ?? '');
  const [checklist, setChecklist] = useState<NoteChecklistItem[]>(
    initialNote?.checklist ?? [{ id: newId(), text: '', checked: false }],
  );
  const [selectedColor, setSelectedColor] = useState<string | null>(initialNote?.color ?? null);
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

  const itemInputRefs = useRef<Record<string, TextInput | null>>({});

  const isDirty = () =>
    JSON.stringify({ title, kind, body, checklist, color: selectedColor }) !==
    initialSnapshot.current;

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
      const note: Note = {
        id: initialNote?.id ?? newId(),
        coupleId,
        createdBy: initialNote?.createdBy ?? userId,
        title: trimmedTitle,
        kind,
        body: kind === 'text' ? body : null,
        checklist:
          kind === 'checklist' ? checklist.filter((item) => item.text.trim().length > 0) : null,
        color: selectedColor,
        createdAt: initialNote?.createdAt ?? now,
        updatedAt: now,
        deletedAt: null,
        syncStatus: 'pending',
      };

      await enqueueNote(db, note);
      notifyLocalChange();
      haptics.confirm();
      router.back();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const handleBack = () => {
    if (isDirty() && title.trim().length > 0) {
      Alert.alert('Unsaved changes', 'Save this note before leaving?', [
        { text: 'Discard', style: 'destructive', onPress: () => router.back() },
        { text: 'Save', onPress: () => void handleSave() },
      ]);
    } else {
      router.back();
    }
  };

  const handleDelete = () => {
    if (!initialNote) return;
    haptics.longPress();
    Alert.alert('Delete note', 'This note will be removed from both phones.', [
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
    const item: NoteChecklistItem = { id: newId(), text: '', checked: false };
    setChecklist((prev) => {
      if (!afterId) return [...prev, item];
      const index = prev.findIndex((entry) => entry.id === afterId);
      if (index === -1) return [...prev, item];
      const next = [...prev];
      next.splice(index + 1, 0, item);
      return next;
    });
    setTimeout(() => itemInputRefs.current[item.id]?.focus(), 50);
  };

  const updateItemText = (id: string, text: string) => {
    setChecklist((prev) => prev.map((item) => (item.id === id ? { ...item, text } : item)));
  };

  const toggleItemChecked = (id: string) => {
    haptics.selection();
    setChecklist((prev) => {
      const updated = prev.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item,
      );
      // Checked items sink to the bottom, the way a paper list behaves.
      return [
        ...updated.filter((item) => !item.checked),
        ...updated.filter((item) => item.checked),
      ];
    });
  };

  const removeItem = (id: string) => {
    setChecklist((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <>
      <TopAppBar
        title={initialNote ? 'Edit note' : 'New note'}
        onBack={handleBack}
        actions={
          <IconButton
            icon="checkmark"
            variant="filled"
            onPress={handleSave}
            disabled={busy || title.trim().length === 0}
            accessibilityLabel="Save note"
          />
        }
      />

      <Screen scroll contentStyle={styles.content}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Title"
          placeholderTextColor={colors.outline}
          maxLength={200}
          selectionColor={colors.primary}
          cursorColor={colors.primary}
          style={[typography.headlineMedium, styles.title, { color: colors.onSurface }]}
        />

        <SegmentedButton
          options={[
            { value: 'text', label: 'Text' },
            { value: 'checklist', label: 'Checklist' },
          ]}
          value={kind}
          onChange={setKind}
        />

        {kind === 'text' ? (
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Write something…"
            placeholderTextColor={colors.outline}
            selectionColor={colors.primary}
            cursorColor={colors.primary}
            multiline
            style={[typography.bodyLarge, styles.body, { color: colors.onSurface }]}
          />
        ) : (
          <View style={styles.checklist}>
            {checklist.map((item) => (
              <Animated.View
                key={item.id}
                layout={
                  reducedMotion
                    ? undefined
                    : LinearTransition.springify()
                        .damping(spring.spatialDefault.damping)
                        .stiffness(spring.spatialDefault.stiffness)
                }
                style={styles.checkRow}
              >
                <Pressable
                  onPress={() => toggleItemChecked(item.id)}
                  hitSlop={10}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: item.checked }}
                  accessibilityLabel={item.text || 'Empty item'}
                >
                  <Ionicons
                    name={item.checked ? 'checkbox' : 'square-outline'}
                    size={24}
                    color={item.checked ? colors.primary : colors.onSurfaceVariant}
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
                  placeholderTextColor={colors.outline}
                  selectionColor={colors.primary}
                  cursorColor={colors.primary}
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
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Remove item"
                >
                  <Ionicons name="close" size={20} color={colors.outline} />
                </Pressable>
              </Animated.View>
            ))}

            <PressableScale
              onPress={() => addItem()}
              haptics="selection"
              scaleTo={0.96}
              accessibilityRole="button"
              accessibilityLabel="Add item"
              style={styles.addItem}
            >
              <Ionicons name="add" size={20} color={colors.primary} />
              <Text variant="bodyLarge" color="primary">
                Add item
              </Text>
            </PressableScale>
          </View>
        )}

        <Text variant="bodyMedium" color="onSurfaceVariant" style={styles.label}>
          Colour
        </Text>
        <View style={styles.swatches}>
          {[null, ...noteColors].map((swatch) => {
            const selected = selectedColor === swatch;
            return (
              <PressableScale
                key={swatch ?? 'none'}
                onPress={() => setSelectedColor(swatch)}
                haptics="selection"
                scaleTo={0.9}
                accessibilityRole="button"
                accessibilityLabel={swatch ? `Colour ${swatch}` : 'No colour'}
                accessibilityState={{ selected }}
                style={[
                  styles.swatch,
                  {
                    backgroundColor: swatch ?? colors.surfaceContainerHighest,
                    borderColor: selected ? colors.onSurface : colors.outlineVariant,
                    borderWidth: selected ? 2 : 1,
                  },
                ]}
              >
                {!swatch ? (
                  <Ionicons name="ban-outline" size={16} color={colors.onSurfaceVariant} />
                ) : selected ? (
                  <Ionicons name="checkmark" size={16} color={colors.onSurface} />
                ) : null}
              </PressableScale>
            );
          })}
        </View>

        {initialNote ? (
          <>
            <View style={styles.gap} />
            <Button
              label="Delete note"
              icon="trash-outline"
              variant="danger"
              onPress={handleDelete}
              size="medium"
              fullWidth
              loading={busy}
            />
          </>
        ) : null}

        {error ? (
          <Text variant="bodySmall" color="error" style={styles.error}>
            {error}
          </Text>
        ) : null}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.lg, paddingBottom: spacing.xxxl },
  title: { paddingVertical: spacing.sm, marginBottom: spacing.lg },
  body: { minHeight: 200, textAlignVertical: 'top', marginTop: spacing.lg },
  checklist: { marginTop: spacing.md },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  itemInput: { flex: 1, paddingVertical: spacing.xs },
  addItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  label: { marginTop: spacing.xxl, marginBottom: spacing.md },
  swatches: { flexDirection: 'row', gap: spacing.md },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: shape.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gap: { height: spacing.xxl },
  error: { marginTop: spacing.md },
});
