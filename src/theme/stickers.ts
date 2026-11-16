import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Sticker {
  id: string;
  packId: 'love' | 'animals' | 'daily' | 'reactions' | 'custom';
  label: string;
  emoji?: string;
  imageUri?: string;
  storagePath?: string;
}

export interface StickerPack {
  id: 'favorites' | 'recents' | 'love' | 'animals' | 'daily' | 'reactions' | 'custom';
  title: string;
  icon: string;
}

export const STICKER_PACKS: StickerPack[] = [
  { id: 'recents', title: 'Recent', icon: 'time-outline' },
  { id: 'favorites', title: 'Favourites', icon: 'star' },
  { id: 'love', title: 'Love', icon: 'heart' },
  { id: 'animals', title: 'Animals', icon: 'paw' },
  { id: 'daily', title: 'Everyday', icon: 'chatbubbles' },
  { id: 'reactions', title: 'Reactions', icon: 'happy' },
  { id: 'custom', title: 'Mine', icon: 'add-circle' },
];

export const BUILTIN_STICKERS: Sticker[] = [
  { id: 'love_kiss', packId: 'love', label: 'Kiss', emoji: '😘' },
  { id: 'love_heart_eyes', packId: 'love', label: 'In love', emoji: '😍' },
  { id: 'love_sparkling_heart', packId: 'love', label: 'Sparkling heart', emoji: '💖' },
  { id: 'love_rose', packId: 'love', label: 'A rose for you', emoji: '🌹' },
  { id: 'love_letter', packId: 'love', label: 'Love letter', emoji: '💌' },
  { id: 'love_heart_arrow', packId: 'love', label: 'Cupid', emoji: '💘' },
  { id: 'love_two_hearts', packId: 'love', label: 'Two hearts', emoji: '💕' },
  { id: 'love_fire_heart', packId: 'love', label: 'Burning love', emoji: '❤️‍🔥' },
  { id: 'love_infinite_hug', packId: 'love', label: 'Big hug', emoji: '🫂' },
  { id: 'love_kiss_mark', packId: 'love', label: 'Kiss mark', emoji: '💋' },
  { id: 'love_growing_heart', packId: 'love', label: 'Growing heart', emoji: '💗' },
  { id: 'love_ribbon_heart', packId: 'love', label: 'My heart is yours', emoji: '💝' },

  { id: 'anim_cat_love', packId: 'animals', label: 'Cat in love', emoji: '😻' },
  { id: 'anim_cat_kiss', packId: 'animals', label: 'Kissy cat', emoji: '😽' },
  { id: 'anim_bear_hug', packId: 'animals', label: 'Bear hug', emoji: '🐻' },
  { id: 'anim_bunny_couple', packId: 'animals', label: 'Sweet bunny', emoji: '🐰' },
  { id: 'anim_puppy_eyes', packId: 'animals', label: 'Puppy eyes', emoji: '🐶' },
  { id: 'anim_fox_cuddle', packId: 'animals', label: 'Cuddly fox', emoji: '🦊' },
  { id: 'anim_koala_cling', packId: 'animals', label: 'Holding on', emoji: '🐨' },
  { id: 'anim_panda_heart', packId: 'animals', label: 'Little panda', emoji: '🐼' },

  { id: 'daily_good_morning', packId: 'daily', label: 'Good morning', emoji: '🌅' },
  { id: 'daily_good_night', packId: 'daily', label: 'Good night', emoji: '🌙' },
  { id: 'daily_coffee_together', packId: 'daily', label: 'Coffee together', emoji: '☕' },
  { id: 'daily_pizza_date', packId: 'daily', label: 'Pizza night', emoji: '🍕' },
  { id: 'daily_wine_toast', packId: 'daily', label: 'Cheers to us', emoji: '🥂' },
  { id: 'daily_movie_night', packId: 'daily', label: 'Movie night', emoji: '🍿' },
  { id: 'daily_coming_home', packId: 'daily', label: 'On my way home', emoji: '🏃' },
  { id: 'daily_thinking_of_you', packId: 'daily', label: 'Thinking of you', emoji: '💭' },

  { id: 'react_blushing', packId: 'reactions', label: 'Blushing', emoji: '😳' },
  { id: 'react_tears_of_joy', packId: 'reactions', label: 'Too good', emoji: '🥹' },
  { id: 'react_star_struck', packId: 'reactions', label: 'You are amazing', emoji: '🤩' },
  { id: 'react_miss_you', packId: 'reactions', label: 'Miss you', emoji: '🥺' },
  { id: 'react_angel_sweet', packId: 'reactions', label: 'An angel', emoji: '😇' },
  { id: 'react_crazy_in_love', packId: 'reactions', label: 'Crazy about you', emoji: '🤪' },
  { id: 'react_giggle', packId: 'reactions', label: 'Giggling with you', emoji: '🤭' },
  { id: 'react_lock_key', packId: 'reactions', label: 'All mine', emoji: '🔒' },
];

const RECENTS_KEY = '@twocouple_sticker_recents_v1';
const FAVORITES_KEY = '@twocouple_sticker_favorites_v1';
const CUSTOM_STICKERS_KEY = '@twocouple_sticker_custom_v1';

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const BASE64_LOOKUP = new Uint8Array(256).fill(255);
for (let i = 0; i < BASE64_CHARS.length; i += 1) {
  BASE64_LOOKUP[BASE64_CHARS.charCodeAt(i)] = i;
}

export function base64ToArrayBuffer(input: string): ArrayBuffer {
  const commaIdx = input.indexOf(',');
  const raw = (commaIdx >= 0 ? input.slice(commaIdx + 1) : input).replace(/\s+/g, '');
  const len = raw.length;
  if (len === 0) return new ArrayBuffer(0);

  let padding = 0;
  if (raw.endsWith('==')) padding = 2;
  else if (raw.endsWith('=')) padding = 1;

  const byteLen = Math.floor((len * 3) / 4) - padding;
  const bytes = new Uint8Array(Math.max(byteLen, 0));

  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const c1 = BASE64_LOOKUP[raw.charCodeAt(i)] ?? 0;
    const c2 = BASE64_LOOKUP[raw.charCodeAt(i + 1)] ?? 0;
    const c3 = BASE64_LOOKUP[raw.charCodeAt(i + 2)] ?? 0;
    const c4 = BASE64_LOOKUP[raw.charCodeAt(i + 3)] ?? 0;

    if (p < byteLen) bytes[p++] = (c1 << 2) | (c2 >> 4);
    if (p < byteLen) bytes[p++] = ((c2 & 15) << 4) | (c3 >> 2);
    if (p < byteLen) bytes[p++] = ((c3 & 3) << 6) | c4;
  }

  return bytes.buffer;
}

export async function loadRecentStickers(): Promise<Sticker[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENTS_KEY);
    return raw ? (JSON.parse(raw) as Sticker[]) : [];
  } catch {
    return [];
  }
}

export async function addRecentSticker(sticker: Sticker): Promise<Sticker[]> {
  try {
    const current = await loadRecentStickers();
    const filtered = current.filter((s) => s.id !== sticker.id);
    const updated = [sticker, ...filtered].slice(0, 20);
    await AsyncStorage.setItem(RECENTS_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [sticker];
  }
}

export async function loadFavoriteStickers(): Promise<Sticker[]> {
  try {
    const raw = await AsyncStorage.getItem(FAVORITES_KEY);
    return raw ? (JSON.parse(raw) as Sticker[]) : [];
  } catch {
    return [];
  }
}

export async function toggleFavoriteSticker(sticker: Sticker): Promise<Sticker[]> {
  try {
    const current = await loadFavoriteStickers();
    const exists = current.some((s) => s.id === sticker.id);
    const updated = exists
      ? current.filter((s) => s.id !== sticker.id)
      : [sticker, ...current];
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export async function loadCustomStickers(): Promise<Sticker[]> {
  try {
    const raw = await AsyncStorage.getItem(CUSTOM_STICKERS_KEY);
    return raw ? (JSON.parse(raw) as Sticker[]) : [];
  } catch {
    return [];
  }
}

export async function addCustomSticker(
  imageUri: string,
  label = 'Sticker',
  storagePath?: string,
): Promise<Sticker> {
  const newSticker: Sticker = {
    id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    packId: 'custom',
    label,
    imageUri,
    storagePath,
  };
  try {
    const current = await loadCustomStickers();
    const updated = [newSticker, ...current];
    await AsyncStorage.setItem(CUSTOM_STICKERS_KEY, JSON.stringify(updated));
  } catch {
    // Best-effort
  }
  return newSticker;
}

export async function updateStickerStoragePath(
  stickerId: string,
  storagePath: string,
): Promise<void> {
  const patchList = async (key: string) => {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return;
      const items = JSON.parse(raw) as Sticker[];
      let changed = false;
      const next = items.map((s) => {
        if (s.id === stickerId && s.storagePath !== storagePath) {
          changed = true;
          return { ...s, storagePath };
        }
        return s;
      });
      if (changed) {
        await AsyncStorage.setItem(key, JSON.stringify(next));
      }
    } catch {
      // Best-effort
    }
  };

  await Promise.all([
    patchList(CUSTOM_STICKERS_KEY),
    patchList(RECENTS_KEY),
    patchList(FAVORITES_KEY),
  ]);
}

export function isStickerMessage(body: string): boolean {
  return (
    typeof body === 'string' &&
    body.endsWith(']') &&
    (body.startsWith('[sticker:') ||
      body.startsWith('[sticker_img:') ||
      body.startsWith('[sticker_storage:'))
  );
}

export function parseStickerMessage(
  body: string,
): { type: 'emoji' | 'image' | 'storage'; value: string } | null {
  if (!isStickerMessage(body)) return null;

  if (body.startsWith('[sticker:')) {
    const emoji = body.slice(9, -1);
    return emoji ? { type: 'emoji', value: emoji } : null;
  }

  if (body.startsWith('[sticker_img:')) {
    const uri = body.slice(13, -1);
    return uri ? { type: 'image', value: uri } : null;
  }

  if (body.startsWith('[sticker_storage:')) {
    const path = body.slice(17, -1);
    return path ? { type: 'storage', value: path } : null;
  }

  return null;
}

export function encodeStickerMessage(sticker: Sticker): string {
  if (sticker.storagePath) {
    return `[sticker_storage:${sticker.storagePath}]`;
  }
  if (sticker.imageUri) {
    return `[sticker_img:${sticker.imageUri}]`;
  }
  return `[sticker:${sticker.emoji ?? '❤️'}]`;
}
