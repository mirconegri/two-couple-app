import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { useAuth } from '../auth/AuthProvider';
import { useTheme } from '../theme/ThemeProvider';
import { useHaptics } from '../lib/haptics';
import { PressableScale } from './PressableScale';
import { IconButton } from './IconButton';
import { Text } from './Text';
import { Button } from './Button';
import { LoadingIndicator } from './LoadingIndicator';
import { EmptyState } from './EmptyState';
import {
  type Sticker,
  type StickerPack,
  STICKER_PACKS,
  BUILTIN_STICKERS,
  loadRecentStickers,
  addRecentSticker,
  loadFavoriteStickers,
  toggleFavoriteSticker,
  loadCustomStickers,
  addCustomSticker,
} from '../theme/stickers';
import { getSignedStickerUrl, uploadStickerToStorage } from '../theme/stickerStorage';
import { shape, spacing } from '../theme/tokens';

export interface StickerPickerProps {
  onSelect: (sticker: Sticker) => void;
  onClose: () => void;
}

/** Local custom stickers are stored as a file URI and only get a signed URL once uploaded. */
function PickerStickerImage({ sticker }: { sticker: Sticker }) {
  const [uri, setUri] = useState<string | undefined>(sticker.imageUri);

  useEffect(() => {
    setUri(sticker.imageUri);
  }, [sticker.imageUri]);

  if (!uri) return null;

  return (
    <Image
      source={{ uri }}
      style={styles.customImage}
      resizeMode="contain"
      onError={() => {
        if (sticker.storagePath && uri === sticker.imageUri) {
          void getSignedStickerUrl(sticker.storagePath).then((signed) => {
            if (signed) setUri(signed);
          });
        }
      }}
    />
  );
}

const EMPTY_COPY: Partial<Record<StickerPack['id'], string>> = {
  recents: 'Stickers you send show up here.',
  favorites: 'Tap the star on a sticker to keep it here.',
  custom: 'Add your own pictures from the gallery.',
};

export function StickerPicker({ onSelect, onClose }: StickerPickerProps) {
  const { coupleId } = useAuth();
  const { colors } = useTheme();
  const haptics = useHaptics();

  const [activeTab, setActiveTab] = useState<StickerPack['id']>('love');
  const [recents, setRecents] = useState<Sticker[]>([]);
  const [favorites, setFavorites] = useState<Sticker[]>([]);
  const [customStickers, setCustomStickers] = useState<Sticker[]>([]);
  const [uploading, setUploading] = useState(false);

  const reloadLists = useCallback(async () => {
    const [recent, favorite, custom] = await Promise.all([
      loadRecentStickers(),
      loadFavoriteStickers(),
      loadCustomStickers(),
    ]);
    setRecents(recent);
    setFavorites(favorite);
    setCustomStickers(custom);
  }, []);

  useEffect(() => {
    void reloadLists();
  }, [reloadLists]);

  const handleSelect = useCallback(
    async (sticker: Sticker) => {
      haptics.light();
      await addRecentSticker(sticker);
      void reloadLists();
      onSelect(sticker);
    },
    [haptics, onSelect, reloadLists],
  );

  const handleToggleFavorite = async (sticker: Sticker) => {
    haptics.longPress();
    setFavorites(await toggleFavoriteSticker(sticker));
  };

  const handleAddFromGallery = async () => {
    if (uploading) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow gallery access to pick a picture for a sticker.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
      base64: true,
    });

    const asset = result.assets?.[0];
    if (result.canceled || !asset?.uri) return;

    setUploading(true);
    try {
      const storagePath = coupleId
        ? await uploadStickerToStorage(coupleId, asset.uri, {
            base64: asset.base64,
            mimeType: asset.mimeType,
          })
        : undefined;
      await handleSelect(await addCustomSticker(asset.uri, 'Custom sticker', storagePath));
    } catch (caught) {
      Alert.alert(
        'Upload failed',
        caught instanceof Error ? caught.message : 'Check your connection and try again.',
      );
    } finally {
      setUploading(false);
    }
  };

  const stickers =
    activeTab === 'recents'
      ? recents
      : activeTab === 'favorites'
        ? favorites
        : activeTab === 'custom'
          ? customStickers
          : BUILTIN_STICKERS.filter((sticker) => sticker.packId === activeTab);

  const addButton = (
    <Button
      label={uploading ? 'Uploading…' : 'Add from gallery'}
      icon="image-outline"
      variant="tonal"
      onPress={handleAddFromGallery}
      disabled={uploading}
      loading={uploading}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="titleSmall">Stickers</Text>
        <IconButton icon="close" size="sm" onPress={onClose} accessibilityLabel="Close stickers" />
      </View>

      <View style={styles.tabs}>
        {STICKER_PACKS.map((pack) => {
          const selected = activeTab === pack.id;
          return (
            <PressableScale
              key={pack.id}
              onPress={() => {
                haptics.tick();
                setActiveTab(pack.id);
              }}
              accessibilityRole="tab"
              accessibilityLabel={pack.title}
              accessibilityState={{ selected }}
              scaleTo={0.9}
              rippleRadius={shape.full}
              style={styles.tab}
            >
              <View
                style={[
                  styles.tabIndicator,
                  selected && { backgroundColor: colors.secondaryContainer },
                ]}
              >
                <Ionicons
                  name={pack.icon as keyof typeof Ionicons.glyphMap}
                  size={22}
                  color={selected ? colors.onSecondaryContainer : colors.onSurfaceVariant}
                />
              </View>
            </PressableScale>
          );
        })}
      </View>

      {stickers.length === 0 ? (
        <View style={styles.empty}>
          <EmptyState
            icon={
              activeTab === 'recents'
                ? 'time-outline'
                : activeTab === 'favorites'
                  ? 'star-outline'
                  : 'images-outline'
            }
            title="Nothing here yet"
            description={EMPTY_COPY[activeTab] ?? 'No stickers in this pack.'}
          />
          {activeTab === 'custom' ? addButton : null}
        </View>
      ) : (
        <FlatList
          data={stickers}
          keyExtractor={(item) => item.id}
          numColumns={4}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.grid}
          renderItem={({ item }) => {
            const favorite = favorites.some((entry) => entry.id === item.id);
            return (
              <View style={styles.gridItem}>
                <PressableScale
                  onPress={() => void handleSelect(item)}
                  onLongPress={() => void handleToggleFavorite(item)}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  scaleTo={0.9}
                  haptics={null}
                  rippleRadius={shape.lg}
                  style={[styles.cell, { backgroundColor: colors.surfaceContainerHigh }]}
                >
                  {item.imageUri || item.storagePath ? (
                    <PickerStickerImage sticker={item} />
                  ) : (
                    <Text style={styles.emoji}>{item.emoji}</Text>
                  )}
                </PressableScale>

                <PressableScale
                  onPress={() => void handleToggleFavorite(item)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    favorite ? `Remove ${item.label} from favourites` : `Add ${item.label} to favourites`
                  }
                  hitSlop={6}
                  scaleTo={0.8}
                  haptics={null}
                  style={styles.favorite}
                >
                  <Ionicons
                    name={favorite ? 'star' : 'star-outline'}
                    size={14}
                    color={favorite ? colors.primary : colors.onSurfaceVariant}
                  />
                </PressableScale>
              </View>
            );
          }}
          ListFooterComponent={
            activeTab === 'custom' && !uploading ? (
              <View style={styles.footer}>{addButton}</View>
            ) : uploading ? (
              <View style={styles.footer}>
                <LoadingIndicator size={20} />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: 320 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    paddingVertical: spacing.xs,
  },
  tabs: { flexDirection: 'row', paddingHorizontal: spacing.sm, gap: spacing.xs },
  tab: { flex: 1, alignItems: 'center', paddingVertical: spacing.xs },
  tabIndicator: {
    width: 56,
    height: 32,
    borderRadius: shape.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { flex: 1, justifyContent: 'center', gap: spacing.md },
  grid: { padding: spacing.sm, paddingBottom: spacing.xxl },
  gridItem: { flex: 1 / 4, aspectRatio: 1, padding: spacing.xs },
  cell: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: shape.lg },
  emoji: { fontSize: 36, lineHeight: 44 },
  customImage: { width: '78%', height: '78%' },
  favorite: { position: 'absolute', top: spacing.sm, right: spacing.sm, padding: 2 },
  footer: { alignItems: 'center', paddingVertical: spacing.md },
});
