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
  { id: 'recents', title: 'Recenti', icon: 'time-outline' },
  { id: 'favorites', title: 'Preferiti', icon: 'star' },
  { id: 'love', title: 'Amore', icon: 'heart' },
  { id: 'animals', title: 'Cuccioli', icon: 'paw' },
  { id: 'daily', title: 'Coppia', icon: 'chatbubbles' },
  { id: 'reactions', title: 'Reazioni', icon: 'happy' },
  { id: 'custom', title: 'I Miei', icon: 'add-circle' },
];

export const BUILTIN_STICKERS: Sticker[] = [
  // Amore
  { id: 'love_kiss', packId: 'love', label: 'Bacio', emoji: '😘' },
  { id: 'love_heart_eyes', packId: 'love', label: 'Innamorato', emoji: '😍' },
  { id: 'love_sparkling_heart', packId: 'love', label: 'Cuore brillante', emoji: '💖' },
  { id: 'love_rose', packId: 'love', label: 'Rosa per te', emoji: '🌹' },
  { id: 'love_letter', packId: 'love', label: "Lettera d'amore", emoji: '💌' },
  { id: 'love_heart_arrow', packId: 'love', label: 'Colpo di fulmine', emoji: '💘' },
  { id: 'love_two_hearts', packId: 'love', label: 'Due cuori', emoji: '💕' },
  { id: 'love_fire_heart', packId: 'love', label: 'Passione', emoji: '❤️‍🔥' },
  { id: 'love_infinite_hug', packId: 'love', label: 'Abbraccio forte', emoji: '🫂' },
  { id: 'love_kiss_mark', packId: 'love', label: 'Bacio stampato', emoji: '💋' },
  { id: 'love_growing_heart', packId: 'love', label: 'Cuore che cresce', emoji: '💗' },
  { id: 'love_ribbon_heart', packId: 'love', label: 'Il mio cuore è tuo', emoji: '💝' },

  // Cuccioli
  { id: 'anim_cat_love', packId: 'animals', label: 'Gattino innamorato', emoji: '😻' },
  { id: 'anim_cat_kiss', packId: 'animals', label: 'Bacetto miao', emoji: '😽' },
  { id: 'anim_bear_hug', packId: 'animals', label: "Abbraccio d'orso", emoji: '🐻' },
  { id: 'anim_bunny_couple', packId: 'animals', label: 'Coniglietto dolce', emoji: '🐰' },
  { id: 'anim_puppy_eyes', packId: 'animals', label: 'Occhi dolci', emoji: '🐶' },
  { id: 'anim_fox_cuddle', packId: 'animals', label: 'Volpina dolce', emoji: '🦊' },
  { id: 'anim_koala_cling', packId: 'animals', label: 'Abbarbicato', emoji: '🐨' },
  { id: 'anim_panda_heart', packId: 'animals', label: 'Panda cucciolotto', emoji: '🐼' },

  // Coppia quotidiana
  { id: 'daily_good_morning', packId: 'daily', label: 'Buongiorno amore', emoji: '🌅' },
  { id: 'daily_good_night', packId: 'daily', label: 'Buonanotte stella', emoji: '🌙' },
  { id: 'daily_coffee_together', packId: 'daily', label: 'Caffè insieme', emoji: '☕' },
  { id: 'daily_pizza_date', packId: 'daily', label: 'Pizza & coccole', emoji: '🍕' },
  { id: 'daily_wine_toast', packId: 'daily', label: 'Brindisi a noi', emoji: '🥂' },
  { id: 'daily_movie_night', packId: 'daily', label: 'Film & copertina', emoji: '🍿' },
  { id: 'daily_coming_home', packId: 'daily', label: 'Torno da te!', emoji: '🏃' },
  { id: 'daily_thinking_of_you', packId: 'daily', label: 'Ti penso sempre', emoji: '💭' },

  // Reazioni
  { id: 'react_blushing', packId: 'reactions', label: 'Arrossisco', emoji: '😳' },
  { id: 'react_tears_of_joy', packId: 'reactions', label: 'Troppo bello', emoji: '🥹' },
  { id: 'react_star_struck', packId: 'reactions', label: 'Sei una meraviglia', emoji: '🤩' },
  { id: 'react_miss_you', packId: 'reactions', label: 'Mi manchi', emoji: '🥺' },
  { id: 'react_angel_sweet', packId: 'reactions', label: 'Un angelo', emoji: '😇' },
  { id: 'react_crazy_in_love', packId: 'reactions', label: 'Pazzo di te', emoji: '🤪' },
  { id: 'react_giggle', packId: 'reactions', label: 'Rido con te', emoji: '🤭' },
  { id: 'react_lock_key', packId: 'reactions', label: 'Solo mio/a', emoji: '🔒' },
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
