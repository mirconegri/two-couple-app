import React, { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../theme/ThemeProvider';
import { PressableScale } from './PressableScale';
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

interface StickerPickerProps {
  onSelect: (sticker: Sticker) => void;
  onClose: () => void;
}

export function StickerPicker({ onSelect, onClose }: StickerPickerProps) {
  const { colors, spacing, radii, typography } = useTheme();

  const [activeTab, setActiveTab] = useState<StickerPack['id']>('love');
  const [recents, setRecents] = useState<Sticker[]>([]);
  const [favorites, setFavorites] = useState<Sticker[]>([]);
  const [customStickers, setCustomStickers] = useState<Sticker[]>([]);

  const reloadLists = useCallback(async () => {
    const [r, f, c] = await Promise.all([
      loadRecentStickers(),
      loadFavoriteStickers(),
      loadCustomStickers(),
    ]);
    setRecents(r);
    setFavorites(f);
    setCustomStickers(c);
  }, []);

  useEffect(() => {
    void reloadLists();
  }, [reloadLists]);

  const handleSelect = async (sticker: Sticker) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await addRecentSticker(sticker);
    void reloadLists();
    onSelect(sticker);
  };

  const handleToggleFavorite = async (sticker: Sticker) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const updated = await toggleFavoriteSticker(sticker);
    setFavorites(updated);
  };

  const handleAddFromGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permesso richiesto',
          'Consenti l\'accesso alla galleria per scegliere o importare sticker.',
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.85,
        aspect: [1, 1],
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        const added = await addCustomSticker(result.assets[0].uri);
        void handleSelect(added);
      }
    } catch (err) {
      Alert.alert('Errore', 'Impossibile caricare l\'immagine.');
    }
  };

  let displayStickers: Sticker[] = [];
  if (activeTab === 'recents') {
    displayStickers = recents;
  } else if (activeTab === 'favorites') {
    displayStickers = favorites;
  } else if (activeTab === 'custom') {
    displayStickers = customStickers;
  } else {
    displayStickers = BUILTIN_STICKERS.filter((s) => s.packId === activeTab);
  }

  const isFavorite = (id: string) => favorites.some((f) => f.id === id);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      ]}
    >
      {/* Header bar */}
      <View style={styles.header}>
        <Text style={[typography.subheadline, { color: colors.text, fontWeight: '600' }]}>
          Stickers
        </Text>
        <PressableScale
          onPress={onClose}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Chiudi pannello sticker"
        >
          <Ionicons name="close-circle" size={24} color={colors.textFaint} />
        </PressableScale>
      </View>

      {/* Tabs list */}
      <View style={styles.tabsRow}>
        {STICKER_PACKS.map((pack) => {
          const isSelected = activeTab === pack.id;
          return (
            <TouchableOpacity
              key={pack.id}
              onPress={() => {
                void Haptics.selectionAsync();
                setActiveTab(pack.id);
              }}
              style={[
                styles.tabButton,
                {
                  backgroundColor: isSelected ? colors.surfaceMuted : 'transparent',
                  borderBottomColor: isSelected ? colors.accent : 'transparent',
                  borderBottomWidth: isSelected ? 2 : 0,
                },
              ]}
            >
              <Ionicons
                name={pack.icon as any}
                size={20}
                color={isSelected ? colors.accent : colors.textFaint}
              />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Sticker grid or empty state */}
      {displayStickers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name={
              activeTab === 'recents'
                ? 'time-outline'
                : activeTab === 'favorites'
                  ? 'star-outline'
                  : 'images-outline'
            }
            size={40}
            color={colors.textFaint}
          />
          <Text style={[typography.subheadline, { color: colors.textMuted, marginTop: spacing.sm }]}>
            {activeTab === 'recents'
              ? 'Nessun recente. Gli ultimi 20 sticker usati appariranno qui!'
              : activeTab === 'favorites'
                ? 'Nessun preferito. Tieni premuto o tocca la stella su qualsiasi sticker!'
                : 'Nessuno sticker personalizzato aggiunto.'}
          </Text>
          {activeTab === 'custom' ? (
            <PressableScale
              onPress={handleAddFromGallery}
              style={[
                styles.addButton,
                { backgroundColor: colors.accent, borderRadius: radii.pill, marginTop: spacing.md },
              ]}
            >
              <Ionicons name="add" size={18} color={colors.onAccent} />
              <Text style={[typography.body, { color: colors.onAccent, fontWeight: '600', marginLeft: 6 }]}>
                Aggiungi da galleria / WhatsApp
              </Text>
            </PressableScale>
          ) : null}
        </View>
      ) : (
        <FlatList
          data={displayStickers}
          keyExtractor={(item) => item.id}
          numColumns={4}
          contentContainerStyle={{ padding: spacing.sm, paddingBottom: spacing.xxxl }}
          renderItem={({ item }) => {
            const fav = isFavorite(item.id);
            return (
              <View style={styles.gridItem}>
                <TouchableOpacity
                  onPress={() => void handleSelect(item)}
                  onLongPress={() => void handleToggleFavorite(item)}
                  style={[
                    styles.stickerTouch,
                    {
                      backgroundColor: colors.surfaceMuted,
                      borderRadius: radii.lg,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  {item.imageUri ? (
                    <Image
                      source={{ uri: item.imageUri }}
                      style={styles.customImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <Text style={styles.emojiText}>{item.emoji}</Text>
                  )}
                </TouchableOpacity>

                {/* Favorite toggle badge */}
                <TouchableOpacity
                  onPress={() => void handleToggleFavorite(item)}
                  style={styles.favBadge}
                  hitSlop={4}
                >
                  <Ionicons
                    name={fav ? 'star' : 'star-outline'}
                    size={14}
                    color={fav ? '#FFCC00' : colors.textFaint}
                  />
                </TouchableOpacity>
              </View>
            );
          }}
          ListFooterComponent={
            activeTab === 'custom' ? (
              <PressableScale
                onPress={handleAddFromGallery}
                style={[
                  styles.addButton,
                  { backgroundColor: colors.accent, borderRadius: radii.pill, marginVertical: spacing.md },
                ]}
              >
                <Ionicons name="add" size={18} color={colors.onAccent} />
                <Text style={[typography.body, { color: colors.onAccent, fontWeight: '600', marginLeft: 6 }]}>
                  Aggiungi altro da galleria
                </Text>
              </PressableScale>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 310,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  gridItem: {
    flex: 1 / 4,
    aspectRatio: 1,
    padding: 6,
    position: 'relative',
  },
  stickerTouch: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: {
    fontSize: 38,
  },
  customImage: {
    width: '80%',
    height: '80%',
  },
  favBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 10,
    padding: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignSelf: 'center',
  },
});
