import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '../lib/supabase';
import { newId } from '../lib/id';
import { base64ToArrayBuffer } from './stickers';

const STICKER_BUCKET = 'stickers';
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
const REFRESH_MARGIN_MS = 60 * 60 * 1000; // refresh 1h before expiry
const URL_CACHE_KEY = '@twocouple_sticker_url_cache_v1';
const MAX_CACHED_URLS = 200;

interface CachedUrlEntry {
  url: string;
  expiresAt: number;
}

const memoryCache = new Map<string, CachedUrlEntry>();
const inflightRequests = new Map<string, Promise<string | null>>();
let diskCacheLoaded = false;

const MIME_TO_EXT: Record<string, { ext: string; contentType: string }> = {
  'image/png': { ext: 'png', contentType: 'image/png' },
  'image/webp': { ext: 'webp', contentType: 'image/webp' },
  'image/gif': { ext: 'gif', contentType: 'image/gif' },
  'image/heic': { ext: 'heic', contentType: 'image/heic' },
  'image/heif': { ext: 'heif', contentType: 'image/heif' },
  'image/jpeg': { ext: 'jpg', contentType: 'image/jpeg' },
  'image/jpg': { ext: 'jpg', contentType: 'image/jpeg' },
};

const EXT_TO_MIME: Record<string, { ext: string; contentType: string }> = {
  png: { ext: 'png', contentType: 'image/png' },
  webp: { ext: 'webp', contentType: 'image/webp' },
  gif: { ext: 'gif', contentType: 'image/gif' },
  heic: { ext: 'heic', contentType: 'image/heic' },
  heif: { ext: 'heif', contentType: 'image/heif' },
  jpg: { ext: 'jpg', contentType: 'image/jpeg' },
  jpeg: { ext: 'jpg', contentType: 'image/jpeg' },
};

function inferMimeAndExt(
  localUri: string,
  mimeType?: string | null,
): { ext: string; contentType: string } {
  const normalizedMime = mimeType?.toLowerCase().trim();
  if (normalizedMime && MIME_TO_EXT[normalizedMime]) {
    return MIME_TO_EXT[normalizedMime];
  }

  const cleanUri = localUri.split('?')[0] ?? localUri;
  const extMatch = /\.([a-z0-9]+)$/i.exec(cleanUri);
  const rawExt = extMatch?.[1]?.toLowerCase();
  if (rawExt && EXT_TO_MIME[rawExt]) {
    return EXT_TO_MIME[rawExt];
  }

  return { ext: 'png', contentType: 'image/png' };
}

async function ensureDiskCacheLoaded(): Promise<void> {
  if (diskCacheLoaded) return;
  diskCacheLoaded = true;
  try {
    const raw = await AsyncStorage.getItem(URL_CACHE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, CachedUrlEntry>;
    const now = Date.now();
    for (const [key, entry] of Object.entries(parsed)) {
      if (entry?.url && entry.expiresAt - REFRESH_MARGIN_MS > now) {
        memoryCache.set(key, entry);
      }
    }
  } catch {
    // Best-effort
  }
}

async function persistDiskCache(): Promise<void> {
  try {
    const now = Date.now();
    const entries = Array.from(memoryCache.entries())
      .filter(([, entry]) => entry.expiresAt > now)
      .slice(-MAX_CACHED_URLS);
    const obj: Record<string, CachedUrlEntry> = {};
    for (const [k, v] of entries) {
      obj[k] = v;
    }
    await AsyncStorage.setItem(URL_CACHE_KEY, JSON.stringify(obj));
  } catch {
    // Best-effort
  }
}

export async function uploadStickerToStorage(
  coupleId: string,
  localUri: string,
  options?: { base64?: string | null; mimeType?: string | null },
): Promise<string> {
  const { ext, contentType } = inferMimeAndExt(localUri, options?.mimeType);

  let arrayBuffer: ArrayBuffer;
  if (options?.base64) {
    arrayBuffer = base64ToArrayBuffer(options.base64);
  } else {
    const response = await fetch(localUri);
    arrayBuffer = await response.arrayBuffer();
  }

  if (arrayBuffer.byteLength === 0) {
    throw new Error('Selected sticker image is empty.');
  }

  const storagePath = `${coupleId}/${newId()}.${ext}`;
  const { error } = await supabase.storage
    .from(STICKER_BUCKET)
    .upload(storagePath, arrayBuffer, {
      contentType,
      cacheControl: '31536000',
      upsert: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  return storagePath;
}

export function getCachedSignedStickerUrl(storagePath: string): string | null {
  const cached = memoryCache.get(storagePath);
  if (cached && cached.expiresAt - REFRESH_MARGIN_MS > Date.now()) {
    return cached.url;
  }
  return null;
}

export async function invalidateSignedStickerUrl(storagePath: string): Promise<void> {
  memoryCache.delete(storagePath);
  await persistDiskCache();
}

export async function getSignedStickerUrl(storagePath: string): Promise<string | null> {
  await ensureDiskCacheLoaded();

  const cached = getCachedSignedStickerUrl(storagePath);
  if (cached) return cached;

  const existing = inflightRequests.get(storagePath);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const { data, error } = await supabase.storage
        .from(STICKER_BUCKET)
        .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

      if (error || !data?.signedUrl) {
        return null;
      }

      memoryCache.set(storagePath, {
        url: data.signedUrl,
        expiresAt: Date.now() + SIGNED_URL_TTL_SECONDS * 1000,
      });
      void persistDiskCache();
      return data.signedUrl;
    } catch {
      return null;
    } finally {
      inflightRequests.delete(storagePath);
    }
  })();

  inflightRequests.set(storagePath, promise);
  return promise;
}
